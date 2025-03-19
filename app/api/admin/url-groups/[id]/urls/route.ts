import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const prismaClient = new PrismaClient();

type Props = {
  params: Promise<{ id: string }>;
};

// POST - Create a new URL within a URL group
export async function POST(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: urlGroupId } = await props.params;

    // Check if URL group exists
    const urlGroup = await prismaClient.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, url, iconPath, displayOrder, idleTimeoutMinutes } = requestData;

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
      // Remove trailing slashes
      normalized = normalized.replace(/\/+$/, "");
      return normalized;
    };

    const normalizedUrl = normalizeUrl(url);

    // Check for similar URLs in the same group
    const searchUrl = (await request.nextUrl.searchParams.get("force")) === "true";
    if (!searchUrl) {
      const similarUrls = await prismaClient.url.findMany({
        where: {
          urlGroupId,
          url: {
            contains: normalizedUrl.toLowerCase(),
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

    // Create new URL
    const newUrl = await prismaClient.url.create({
      data: {
        title,
        url: normalizedUrl,
        iconPath: iconPath || null,
        displayOrder: displayOrder || 0,
        idleTimeoutMinutes: timeoutMinutes,
        urlGroupId,
      },
    });

    return NextResponse.json(newUrl, { status: 201 });
  } catch (error) {
    console.error("Error creating URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prismaClient.$disconnect();
  }
}

// PUT - Update URLs in a group
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;
    const { urlIds } = await request.json();

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Update URLs in the group
    // First, get all URLs currently in the group
    const currentUrls = await prisma.url.findMany({
      where: { urlGroupId: id },
    });

    // Create a transaction for all updates
    const updates = [];

    // Remove urlGroupId from current URLs that are not in the new selection
    if (currentUrls.length > 0) {
      updates.push(
        prisma.url.updateMany({
          where: {
            urlGroupId: id,
            id: { notIn: urlIds },
          },
          data: {
            urlGroupId: "", // Using empty string instead of null
          },
        }),
      );
    }

    // Add urlGroupId to new URLs
    if (urlIds.length > 0) {
      updates.push(
        prisma.url.updateMany({
          where: {
            id: { in: urlIds },
          },
          data: {
            urlGroupId: id,
          },
        }),
      );
    }

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URLs in group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
