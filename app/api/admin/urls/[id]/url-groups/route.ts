import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface RouteContext {
  params: { id: string };
}

// GET - Fetch URL groups for a specific URL
export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Get all URL groups that contain this URL
    const urlInGroups = await prisma.urlsInGroups.findMany({
      where: { urlId: id },
      include: {
        group: true,
      },
    });

    // Extract just the URL group information
    const urlGroups = urlInGroups.map((uig) => uig.group);

    return NextResponse.json(urlGroups);
  } catch (error) {
    console.error("Error fetching URL groups for URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT - Update URL groups for a specific URL
export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const { urlGroupIds } = await request.json();

    if (!Array.isArray(urlGroupIds)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected urlGroupIds array." },
        { status: 400 },
      );
    }

    // First, check if the URL exists
    const url = await prisma.url.findUnique({
      where: { id },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Get current group assignments
    const currentAssignments = await prisma.urlsInGroups.findMany({
      where: { urlId: id },
      select: { groupId: true },
    });

    const currentGroupIds = currentAssignments.map((assignment) => assignment.groupId);

    // Determine which groups to add and which to remove
    const groupIdsToAdd = urlGroupIds.filter((groupId) => !currentGroupIds.includes(groupId));
    const groupIdsToRemove = currentGroupIds.filter((groupId) => !urlGroupIds.includes(groupId));

    // Start a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Remove URL from groups that are no longer assigned
      if (groupIdsToRemove.length > 0) {
        await tx.urlsInGroups.deleteMany({
          where: {
            urlId: id,
            groupId: { in: groupIdsToRemove },
          },
        });
      }

      // Add URL to newly assigned groups
      for (const groupId of groupIdsToAdd) {
        // Get the highest display order in the group
        const highestOrder = await tx.urlsInGroups.findFirst({
          where: { groupId },
          orderBy: { displayOrder: "desc" },
          select: { displayOrder: true },
        });

        const nextOrder = highestOrder ? highestOrder.displayOrder + 1 : 0;

        await tx.urlsInGroups.create({
          data: {
            urlId: id,
            groupId,
            displayOrder: nextOrder,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URL groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
