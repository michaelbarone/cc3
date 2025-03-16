import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    groupId: string;
  };
}

// Get all users assigned to a URL group (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Fetch all users assigned to the URL group
    const userUrlGroups = await prisma.userUrlGroup.findMany({
      where: { urlGroupId: groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true,
          }
        }
      }
    });

    // Transform the data to a more frontend-friendly format
    const users = userUrlGroups.map(({ user }: { user: { id: string; username: string; isAdmin: boolean } }) => ({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users for URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update user assignments for a URL group (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;
    const { userIds } = await request.json();

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'User IDs must be an array' },
        { status: 400 }
      );
    }

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Check if all users exist (if any)
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
      });

      if (users.length !== userIds.length) {
        return NextResponse.json(
          { error: 'One or more users not found' },
          { status: 404 }
        );
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Delete all existing user-URL group mappings for this group
      await tx.userUrlGroup.deleteMany({
        where: { urlGroupId: groupId },
      });

      // Create new mappings if any
      if (userIds.length > 0) {
        await tx.userUrlGroup.createMany({
          data: userIds.map(userId => ({
            userId,
            urlGroupId: groupId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user assignments for URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
