import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Fetch a specific URL
export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken(token);

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the URL
    const url = await prisma.url.findUnique({
      where: { id },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    return NextResponse.json(url);
  } catch (error) {
    console.error("Error fetching URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update a URL
export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken(token);

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Check if URL exists
    const existingUrl = await prisma.url.findUnique({
      where: { id },
    });

    if (!existingUrl) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    const {
      title,
      url,
      urlMobile,
      iconPath,
      idleTimeoutMinutes,
      isLocalhost,
      port,
      path,
      localhostMobilePort,
      localhostMobilePath,
    } = requestData;

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // For localhost URLs, validate that either port or path is provided
    if (isLocalhost) {
      if (!port && !path) {
        return NextResponse.json(
          { error: "Either port or path is required for localhost URLs" },
          { status: 400 },
        );
      }

      // Validate path format if provided
      if (path && !path.startsWith("/")) {
        return NextResponse.json({ error: "Path must start with /" }, { status: 400 });
      }

      // Validate mobile path format if provided
      if (localhostMobilePath && !localhostMobilePath.startsWith("/")) {
        return NextResponse.json({ error: "Mobile path must start with /" }, { status: 400 });
      }
    } else {
      // For standard URLs, validate URL field
      if (!url || url.trim().length === 0) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }
    }

    // Convert idleTimeoutMinutes to number or use default
    let timeoutMinutes = 10; // Default
    if (idleTimeoutMinutes !== undefined && idleTimeoutMinutes !== null) {
      timeoutMinutes = Number(idleTimeoutMinutes);
      if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
        return NextResponse.json(
          { error: "Idle timeout must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    // Update URL
    const updatedUrl = await prisma.url.update({
      where: { id },
      data: {
        title,
        url: url || "", // Always store the actual URL, even for localhost
        urlMobile: urlMobile || null,
        iconPath: iconPath || null,
        idleTimeoutMinutes: timeoutMinutes,
        // @ts-ignore - These fields exist in our schema but TypeScript doesn't know about them yet
        isLocalhost: isLocalhost || false,
        port: port || null,
        path: path || null,
        localhostMobilePort: localhostMobilePort || null,
        localhostMobilePath: localhostMobilePath || null,
      },
    });

    return NextResponse.json(updatedUrl);
  } catch (error) {
    console.error("Error updating URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Remove a URL
export async function DELETE(
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

    const { id } = await params;

    // Get the URL to check if it has an icon
    const url = await prisma.url.findUnique({
      where: { id },
      select: { iconPath: true },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Delete the icon file if it exists
    if (url.iconPath) {
      const iconPath = path.join(process.cwd(), "public", url.iconPath);
      try {
        await fs.unlink(iconPath);
      } catch (error) {
        console.error("Failed to delete icon file:", error);
      }
    }

    // Get all groups this URL is in to update display orders
    const urlGroups = await prisma.urlsInGroups.findMany({
      where: { urlId: id },
      select: { groupId: true, displayOrder: true },
    });

    // Delete the URL and update display orders in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the URL (this will cascade delete from urls_in_groups)
      await tx.url.delete({
        where: { id },
      });

      // Update display orders for each affected group
      for (const group of urlGroups) {
        await tx.urlsInGroups.updateMany({
          where: {
            groupId: group.groupId,
            displayOrder: { gt: group.displayOrder },
          },
          data: {
            displayOrder: { decrement: 1 },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
