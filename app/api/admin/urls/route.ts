import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Helper function to discover favicon
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

// GET: Fetch all global URLs
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Fetch URLs sorted by title
    const urls = await prisma.url.findMany({
      orderBy: [{ title: "asc" }],
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

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Error fetching URLs:", error);
    return NextResponse.json({ error: "Failed to fetch URLs" }, { status: 500 });
  }
}

// POST: Create a new global URL
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Parse request body
    const { originalUrl, title, faviconUrl, mobileSpecificUrl, notes } = await request.json();

    // Validate required fields
    if (!originalUrl || originalUrl.trim() === "") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Check for duplicate originalUrl
    const existingUrl = await prisma.url.findFirst({
      where: { url: originalUrl.trim() },
    });

    if (existingUrl) {
      return NextResponse.json(
        {
          error: `URL exists as '${existingUrl.title}'`,
          existingUrl,
        },
        { status: 409 },
      );
    }

    // Auto-discover favicon if not provided
    let finalFaviconUrl = faviconUrl;
    if (!finalFaviconUrl) {
      finalFaviconUrl = await discoverFavicon(originalUrl.trim());
    }

    // Create the URL
    const newUrl = await prisma.url.create({
      data: {
        url: originalUrl.trim(),
        title: title.trim(),
        faviconUrl: finalFaviconUrl,
        mobileSpecificUrl: mobileSpecificUrl?.trim(),
        notes: notes?.trim(),
        addedById: session.user.id,
      },
    });

    return NextResponse.json(newUrl, { status: 201 });
  } catch (error) {
    console.error("Error creating URL:", error);
    return NextResponse.json({ error: "Failed to create URL" }, { status: 500 });
  }
}
