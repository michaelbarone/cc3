import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface UrlInGroup {
  urlId: string;
  groupId: string;
  displayOrder: number;
}

// POST - Create a new URL within a URL group
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    // Skip auth verification in test mode
    if (!isTest) {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userData = await verifyToken(token);

      if (!userData || !userData.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { id: urlGroupId } = await params;

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, url, iconPath, idleTimeoutMinutes } = requestData;

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!url || url.trim().length === 0) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URLs by removing trailing slashes and converting to lowercase
    const normalizeUrl = (inputUrl: string): string => {
      let normalized = inputUrl.toLowerCase().trim();
      normalized = normalized.replace(/\/+$/, "");
      return normalized;
    };

    const normalizedUrl = normalizeUrl(url);

    // Check for similar URLs
    const searchUrl = (await request.nextUrl.searchParams.get("force")) === "true";
    if (!searchUrl) {
      const similarUrls = await prisma.url.findMany({
        where: {
          url: {
            contains: normalizedUrl.toLowerCase(),
          },
        },
        include: {
          urlGroups: {
            include: {
              group: true,
            },
          },
        },
      });

      if (similarUrls.length > 0) {
        return NextResponse.json(
          {
            error: "Similar URLs found",
            similarUrls,
          },
          { status: 409 },
        );
      }
    }

    // Convert idleTimeoutMinutes to number or use default
    let timeoutMinutes = 10; // Default
    if (idleTimeoutMinutes !== undefined) {
      timeoutMinutes = Number(idleTimeoutMinutes);
      if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
        return NextResponse.json(
          { error: "Idle timeout must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    // Use a transaction to create URL and add to group
    const result = await prisma.$transaction(async (tx) => {
      // Create new URL
      const newUrl = await tx.url.create({
        data: {
          title,
          url: normalizedUrl,
          iconPath: iconPath || null,
          idleTimeoutMinutes: timeoutMinutes,
        },
      });

      // Get the current highest display order in the group
      const maxDisplayOrder = await tx.urlsInGroups.aggregate({
        where: { groupId: urlGroupId },
        _max: { displayOrder: true },
      });

      let displayOrder = (maxDisplayOrder._max?.displayOrder || -1) + 1;

      // Add URL to group with next display order
      await tx.urlsInGroups.create({
        data: {
          urlId: newUrl.id,
          groupId: urlGroupId,
          displayOrder,
        },
      });

      return newUrl;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update URLs in a group
export async function PUT(
  request: NextRequest,
  { params }: RouteContext,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    let isAdmin = false;

    // Handle authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken(token);
    isAdmin = userData?.isAdmin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;
    const { urlIds } = await request.json();

    try {
      // Check if URL group exists
      const group = await prisma.urlGroup.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return NextResponse.json({ error: "URL group not found" }, { status: 404 });
      }

      // Update URLs in group
      await prisma.$transaction([
        prisma.urlsInGroups.deleteMany({
          where: { groupId },
        }),
        prisma.urlsInGroups.createMany({
          data: urlIds.map((urlId: string, index: number) => ({
            urlId,
            groupId,
            displayOrder: index,
          })),
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating URLs in group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET - List URLs in a group
export async function GET(
  request: NextRequest,
  { params }: RouteContext,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    // Skip auth verification in test mode
    if (!isTest) {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userData = await verifyToken(token);

      if (!userData || !userData.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { id: groupId } = await params;

    // First check if the group exists
    const group = await prisma.urlGroup.findUnique({
      where: { id: groupId },
      include: {
        urls: {
          include: {
            url: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Transform the data to match the expected format
    const urls = group.urls.map((uig) => ({
      id: uig.url.id,
      title: uig.url.title,
      url: uig.url.url,
      urlMobile: uig.url.urlMobile,
      iconPath: uig.url.iconPath,
      idleTimeoutMinutes: uig.url.idleTimeoutMinutes,
      createdAt: uig.url.createdAt,
      updatedAt: uig.url.updatedAt,
      displayOrder: uig.displayOrder,
    }));

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Error fetching URLs in group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove URLs from a group
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    let isAdmin = false;

    // Handle authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken(token);
    isAdmin = userData?.isAdmin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;

    try {
      // Check if URL group exists
      const group = await prisma.urlGroup.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return NextResponse.json({ error: "URL group not found" }, { status: 404 });
      }

      // Delete URLs from group
      await prisma.$transaction([
        prisma.urlsInGroups.deleteMany({
          where: { groupId },
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error deleting URLs from group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
