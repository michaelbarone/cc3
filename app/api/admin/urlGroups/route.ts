import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch all URL groups
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Fetch groups with ordered sorting (displayOrder then name)
    const groups = await prisma.group.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
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

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching URL groups:", error);
    return NextResponse.json({ error: "Failed to fetch URL groups" }, { status: 500 });
  }
}

// POST: Create a new URL group
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Parse request body
    const { name, description, displayOrder } = await request.json();

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Create the group
    const newGroup = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        displayOrder: displayOrder || undefined,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating URL group:", error);
    return NextResponse.json({ error: "Failed to create URL group" }, { status: 500 });
  }
}
