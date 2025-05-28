import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch all URLs in a specific group
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch URLs in the group with ordering by displayOrderInGroup
    const urlsInGroup = await prisma.urlInGroup.findMany({
      where: { groupId: id },
      orderBy: { displayOrderInGroup: "asc" } as any,
      include: {
        url: {
          include: {
            addedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(urlsInGroup);
  } catch (error) {
    console.error("Error fetching URLs in group:", error);
    return NextResponse.json({ error: "Failed to fetch URLs in group" }, { status: 500 });
  }
}

// POST: Add a URL to a group
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;
    const { urlId, groupSpecificTitle, displayOrderInGroup } = await request.json();

    // Validate required fields
    if (!urlId) {
      return NextResponse.json({ error: "URL ID is required" }, { status: 400 });
    }

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if URL exists
    const url = await prisma.url.findUnique({
      where: { id: urlId },
    });

    if (!url) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    // Check if URL is already in the group
    const existingUrlInGroup = await prisma.urlInGroup.findUnique({
      where: {
        urlId_groupId: {
          urlId,
          groupId: id,
        },
      },
    });

    if (existingUrlInGroup) {
      return NextResponse.json({ error: "URL is already in this group" }, { status: 409 });
    }

    // Get the highest current displayOrderInGroup to append at the end if not specified
    let newDisplayOrder = displayOrderInGroup;
    if (newDisplayOrder === undefined) {
      const highestOrder = await prisma.urlInGroup.findFirst({
        where: { groupId: id },
        orderBy: { displayOrderInGroup: "desc" } as any,
        select: { displayOrderInGroup: true } as any,
      });

      newDisplayOrder = highestOrder ? (highestOrder as any).displayOrderInGroup + 10 : 10;
    }

    // Add URL to the group
    const urlInGroup = await prisma.urlInGroup.create({
      data: {
        urlId,
        groupId: id,
        groupSpecificTitle: groupSpecificTitle?.trim(),
        displayOrderInGroup: newDisplayOrder,
      } as any,
    });

    return NextResponse.json(urlInGroup, { status: 201 });
  } catch (error) {
    console.error("Error adding URL to group:", error);
    return NextResponse.json({ error: "Failed to add URL to group" }, { status: 500 });
  }
}
