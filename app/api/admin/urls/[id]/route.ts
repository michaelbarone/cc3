import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Helper function to discover favicon (same as in route.ts)
async function discoverFavicon(url: string): Promise<string | null> {
  try {
    // Set timeout for the request
    const response = await axios.get(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerioLoad(html);

    // Priority order for icon discovery
    // 1. Apple touch icon (usually higher resolution)
    let faviconUrl =
      $('link[rel="apple-touch-icon"]').attr("href") ||
      $('link[rel="apple-touch-icon-precomposed"]').attr("href");

    // 2. Standard favicon
    if (!faviconUrl) {
      faviconUrl =
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href") ||
        $('link[rel="mask-icon"]').attr("href");
    }

    // 3. Check manifest
    if (!faviconUrl) {
      const manifestUrl = $('link[rel="manifest"]').attr("href");
      if (manifestUrl) {
        try {
          const fullManifestUrl = new URL(manifestUrl, url).toString();
          const manifestResponse = await axios.get(fullManifestUrl, { timeout: 3000 });
          const manifest = manifestResponse.data;

          if (manifest.icons && manifest.icons.length > 0) {
            // Get the largest icon
            const largestIcon = manifest.icons.reduce((prev: any, current: any) => {
              const prevSize = prev.sizes ? parseInt(prev.sizes.split("x")[0]) : 0;
              const currentSize = current.sizes ? parseInt(current.sizes.split("x")[0]) : 0;
              return currentSize > prevSize ? current : prev;
            });

            faviconUrl = largestIcon.src;
          }
        } catch (error) {
          console.error("Error fetching manifest:", error);
        }
      }
    }

    // 4. Check Open Graph image as last resort
    if (!faviconUrl) {
      faviconUrl = $('meta[property="og:image"]').attr("content");
    }

    // 5. Default to /favicon.ico if nothing else found
    if (!faviconUrl) {
      faviconUrl = "/favicon.ico";
    }

    // Convert relative URL to absolute
    if (faviconUrl && !faviconUrl.startsWith("http")) {
      faviconUrl = new URL(faviconUrl, url).toString();
    }

    return faviconUrl || null;
  } catch (error) {
    console.error(`Error discovering favicon for ${url}:`, error);
    return null;
  }
}

// GET: Fetch a specific URL by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;

    // Fetch the URL with related counts
    const url = await prisma.url.findUnique({
      where: { id },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            urlInGroups: true,
          },
        },
      },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    return NextResponse.json(url);
  } catch (error) {
    console.error("Error fetching URL:", error);
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
  }
}

// PATCH: Update a URL
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;
    const { originalUrl, title, faviconUrl, mobileSpecificUrl, notes } = await request.json();

    // Validate required fields if provided
    if (originalUrl !== undefined && (originalUrl === null || originalUrl.trim() === "")) {
      return NextResponse.json({ error: "URL cannot be empty" }, { status: 400 });
    }

    if (title !== undefined && (title === null || title.trim() === "")) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    // Check if URL exists
    const existingUrl = await prisma.url.findUnique({
      where: { id },
    });

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Check for duplicate originalUrl if changing
    if (originalUrl && originalUrl.trim() !== existingUrl.url) {
      const duplicateUrl = await prisma.url.findFirst({
        where: {
          url: originalUrl.trim(),
          id: { not: id },
        },
      });

      if (duplicateUrl) {
        return NextResponse.json(
          {
            error: `URL exists as '${duplicateUrl.title}'`,
            existingUrl: duplicateUrl,
          },
          { status: 409 },
        );
      }
    }

    // Auto-discover favicon if URL changed and no explicit favicon provided
    let finalFaviconUrl = faviconUrl;
    if (originalUrl && originalUrl.trim() !== existingUrl.url && finalFaviconUrl === undefined) {
      finalFaviconUrl = await discoverFavicon(originalUrl.trim());
    }

    // Update the URL
    const updatedUrl = await prisma.url.update({
      where: { id },
      data: {
        ...(originalUrl !== undefined && { url: originalUrl.trim() }),
        ...(title !== undefined && { title: title.trim() }),
        ...(finalFaviconUrl !== undefined && { faviconUrl: finalFaviconUrl }),
        ...(mobileSpecificUrl !== undefined && {
          mobileSpecificUrl: mobileSpecificUrl?.trim() || null,
        }),
        ...(notes !== undefined && {
          notes: notes?.trim() || null,
        }),
      },
    });

    return NextResponse.json(updatedUrl);
  } catch (error) {
    console.error("Error updating URL:", error);
    return NextResponse.json({ error: "Failed to update URL" }, { status: 500 });
  }
}

// DELETE: Delete a URL
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;

    // Check if URL exists and get related counts
    const existingUrl = await prisma.url.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            urlInGroups: true,
          },
        },
      },
    });

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Delete the URL (cascade deletion for urlInGroups)
    await prisma.url.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "URL deleted successfully",
      deletedFromGroups: existingUrl._count.urlInGroups,
    });
  } catch (error) {
    console.error("Error deleting URL:", error);
    return NextResponse.json({ error: "Failed to delete URL" }, { status: 500 });
  }
}
