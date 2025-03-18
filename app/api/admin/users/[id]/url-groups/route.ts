import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

interface UrlGroupData {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get all URL groups assigned to a user (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all URL groups assigned to the user
    const userUrlGroups = await prisma.userUrlGroup.findMany({
      where: { userId: id },
      include: {
        urlGroup: true,
      },
    });

    // Transform the data to a more frontend-friendly format
    const urlGroups = userUrlGroups.map(({ urlGroup }: { urlGroup: UrlGroupData }) => urlGroup);

    return NextResponse.json(urlGroups);
  } catch (error) {
    console.error("Error fetching URL groups for user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Assign URL groups to a user (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = params;
    const { urlGroupIds } = await request.json();

    if (!Array.isArray(urlGroupIds) || urlGroupIds.length === 0) {
      return NextResponse.json(
        { error: "URL group IDs must be a non-empty array" },
        { status: 400 },
      );
    }

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if all URL groups exist
    const urlGroups = await prisma.urlGroup.findMany({
      where: {
        id: {
          in: urlGroupIds,
        },
      },
    });

    if (urlGroups.length !== urlGroupIds.length) {
      return NextResponse.json({ error: "One or more URL groups not found" }, { status: 404 });
    }

    // Create user-URL group mappings
    const createPromises = urlGroupIds.map((urlGroupId) =>
      prisma.userUrlGroup.upsert({
        where: {
          userId_urlGroupId: {
            userId: id,
            urlGroupId,
          },
        },
        update: {},
        create: {
          userId: id,
          urlGroupId,
        },
      }),
    );

    await Promise.all(createPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning URL groups to user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Replace all URL group assignments for a user (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = params;
    const { urlGroupIds } = await request.json();

    if (!Array.isArray(urlGroupIds)) {
      return NextResponse.json({ error: "URL group IDs must be an array" }, { status: 400 });
    }

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if all URL groups exist (if any)
    if (urlGroupIds.length > 0) {
      const urlGroups = await prisma.urlGroup.findMany({
        where: {
          id: {
            in: urlGroupIds,
          },
        },
      });

      if (urlGroups.length !== urlGroupIds.length) {
        return NextResponse.json({ error: "One or more URL groups not found" }, { status: 404 });
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all existing user-URL group mappings for this user
      await tx.userUrlGroup.deleteMany({
        where: { userId: id },
      });

      // Create new mappings if any
      if (urlGroupIds.length > 0) {
        await tx.userUrlGroup.createMany({
          data: urlGroupIds.map((urlGroupId) => ({
            userId: id,
            urlGroupId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URL group assignments for user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
