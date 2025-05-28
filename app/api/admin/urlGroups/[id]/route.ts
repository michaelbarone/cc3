import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch a specific URL group by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;

    // Fetch the group with related counts
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            urlsInGroup: true,
            userAccesses: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching URL group:", error);
    return NextResponse.json({ error: "Failed to fetch URL group" }, { status: 500 });
  }
}

// PATCH: Update a URL group
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;
    const { name, description, displayOrder } = await request.json();

    // Validate required fields
    if (name !== undefined && (name === null || name.trim() === "")) {
      return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
    }

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Update the group
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(displayOrder !== undefined && {
          displayOrder: displayOrder,
        }),
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating URL group:", error);
    return NextResponse.json({ error: "Failed to update URL group" }, { status: 500 });
  }
}

// DELETE: Delete a URL group
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = params;

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            urlsInGroup: true,
            userAccesses: true,
          },
        },
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Delete the group (cascade deletion for UrlInGroup and UserGroupAccess)
    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "URL group deleted successfully",
      deletedUrls: existingGroup._count.urlsInGroup,
      deletedAccesses: existingGroup._count.userAccesses,
    });
  } catch (error) {
    console.error("Error deleting URL group:", error);
    return NextResponse.json({ error: "Failed to delete URL group" }, { status: 500 });
  }
}
