import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{ id: string }>;
};

// Get all users assigned to a URL group (admin only)
export async function GET(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the URL group ID from params
    const { id } = await props.params;

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Get all user assignments for this group
    const assignments = await prisma.userUrlGroup.findMany({
      where: { urlGroupId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Extract just the user information
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = assignments.map((assignment: any) => assignment.user);

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error getting URL group users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update users assigned to a URL group (admin only)
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the URL group ID from params
    const { id } = await props.params;
    const { userIds } = await request.json();

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id },
    });

    if (!urlGroup) {
      return NextResponse.json({ error: "URL group not found" }, { status: 404 });
    }

    // Validate that all users exist
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: "One or more users not found" }, { status: 400 });
    }

    // Update assignments in a transaction
    await prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
        >,
      ) => {
        // Remove all existing assignments
        await tx.userUrlGroup.deleteMany({
          where: { urlGroupId: id },
        });

        // Create new assignments
        await tx.userUrlGroup.createMany({
          data: userIds.map((userId: string) => ({
            userId,
            urlGroupId: id,
          })),
        });
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating URL group users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
