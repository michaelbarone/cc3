import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: {
    id: string;
  };
}

interface UrlInGroup {
  urlId: string;
  groupId: string;
  displayOrder: number;
}

// POST - Create a new URL within a URL group
export async function POST(
  request: NextRequest,
  props: Props,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    // Skip auth verification in test mode
    if (!isTest && !(await verifyToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: urlGroupId } = props.params;

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
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const user = await verifyToken();

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = props.params;
    const { urlIds } = await request.json();

    // Check if URL group exists
    const group = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Update URLs in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove all existing URLs from the group
      await tx.urlsInGroups.deleteMany({
        where: { groupId },
      });

      // Add new URLs
      await tx.urlsInGroups.createMany({
        data: urlIds.map((urlId: string) => ({
          urlId,
          groupId,
        })),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URLs in group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET - List URLs in a group
export async function GET(
  request: NextRequest,
  { params }: Props,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    // Skip auth verification in test mode
    if (!isTest && !(await verifyToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = params;

    // First check if the group exists
    const group = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Get URLs in the group with their details and order
    const urls = await prisma.$queryRaw`
      SELECT
        u.id,
        u.title,
        u.url,
        u.urlMobile,
        u.iconPath,
        u.idleTimeoutMinutes,
        u.createdAt,
        u.updatedAt,
        uig.displayOrder
      FROM Url u
      JOIN urls_in_groups uig ON u.id = uig.urlId
      WHERE uig.groupId = ${groupId}
      ORDER BY uig.displayOrder ASC
    `;

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Error fetching URLs in group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove URLs from a group
export async function DELETE(
  request: NextRequest,
  props: Props,
  isTest: boolean = false,
): Promise<NextResponse> {
  try {
    // Skip auth verification in test mode
    if (!isTest && !(await verifyToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = props.params;

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
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

    const { urlIds } = requestData;

    if (!Array.isArray(urlIds) || urlIds.length === 0) {
      return NextResponse.json({ error: "urlIds must be a non-empty array" }, { status: 400 });
    }

    // Use a transaction to remove URLs and update display orders
    const result = await prisma.$transaction(async (tx) => {
      // Get current URLs in group for reordering
      const currentUrls = await tx.urlsInGroups.findMany({
        where: { groupId },
        orderBy: { displayOrder: "asc" },
      });

      // Remove specified URLs
      await tx.urlsInGroups.deleteMany({
        where: {
          groupId,
          urlId: {
            in: urlIds,
          },
        },
      });

      // Get remaining URLs and update their display orders
      const remainingUrls = currentUrls.filter((url) => !urlIds.includes(url.urlId));

      // Update display orders to be sequential
      for (let i = 0; i < remainingUrls.length; i++) {
        await tx.urlsInGroups.update({
          where: {
            urlId_groupId: {
              urlId: remainingUrls[i].urlId,
              groupId,
            },
          },
          data: {
            displayOrder: i,
          },
        });
      }

      return {
        removed: urlIds.length,
        remaining: remainingUrls.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error removing URLs from group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
