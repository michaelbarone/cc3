import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { UrlInGroupUpdateInput } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch a specific URL in a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; urlId: string } },
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { urlId } = params;

    // Fetch the URL in group
    const urlInGroup = await prisma.urlInGroup.findUnique({
      where: { id: urlId },
      include: {
        url: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!urlInGroup) {
      return NextResponse.json({ error: "URL in group not found" }, { status: 404 });
    }

    return NextResponse.json(urlInGroup);
  } catch (error) {
    console.error("Error fetching URL in group:", error);
    return NextResponse.json({ error: "Failed to fetch URL in group" }, { status: 500 });
  }
}

// PUT: Update a URL in a group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; urlId: string } },
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { urlId } = params;
    const { groupSpecificTitle, displayOrderInGroup } = await request.json();

    // Fetch the URL in group to make sure it exists
    const urlInGroup = await prisma.urlInGroup.findUnique({
      where: { id: urlId },
    });

    if (!urlInGroup) {
      return NextResponse.json({ error: "URL in group not found" }, { status: 404 });
    }

    // Update the URL in group
    const updatedUrlInGroup = await prisma.urlInGroup.update({
      where: { id: urlId },
      data: {
        ...(groupSpecificTitle !== undefined && {
          groupSpecificTitle: groupSpecificTitle?.trim() || null,
        }),
        ...(displayOrderInGroup !== undefined && {
          displayOrderInGroup,
        }),
      } as UrlInGroupUpdateInput,
    });

    return NextResponse.json(updatedUrlInGroup);
  } catch (error) {
    console.error("Error updating URL in group:", error);
    return NextResponse.json({ error: "Failed to update URL in group" }, { status: 500 });
  }
}

// DELETE: Remove a URL from a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; urlId: string } },
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { urlId } = params;

    // Fetch the URL in group to make sure it exists
    const urlInGroup = await prisma.urlInGroup.findUnique({
      where: { id: urlId },
    });

    if (!urlInGroup) {
      return NextResponse.json({ error: "URL in group not found" }, { status: 404 });
    }

    // Delete the URL from the group
    await prisma.urlInGroup.delete({
      where: { id: urlId },
    });

    return NextResponse.json({}, { status: 204 });
  } catch (error) {
    console.error("Error removing URL from group:", error);
    return NextResponse.json({ error: "Failed to remove URL from group" }, { status: 500 });
  }
}
