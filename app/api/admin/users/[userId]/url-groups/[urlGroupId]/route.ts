import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    userId: string;
    urlGroupId: string;
  };
}

// Check if a user has a specific URL group assigned (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Check if the user has this URL group assigned
    const userUrlGroup = await prisma.userUrlGroup.findUnique({
      where: {
        userId_urlGroupId: {
          userId,
          urlGroupId,
        },
      },
    });

    return NextResponse.json({
      assigned: !!userUrlGroup
    });
  } catch (error) {
    console.error('Error checking user URL group assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Assign a specific URL group to a user (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Create or update the user-URL group mapping
    await prisma.userUrlGroup.upsert({
      where: {
        userId_urlGroupId: {
          userId,
          urlGroupId,
        },
      },
      update: {},
      create: {
        userId,
        urlGroupId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning URL group to user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove a specific URL group from a user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Check if the user has this URL group assigned
    const userUrlGroup = await prisma.userUrlGroup.findUnique({
      where: {
        userId_urlGroupId: {
          userId,
          urlGroupId,
        },
      },
    });

    if (!userUrlGroup) {
      return NextResponse.json(
        { error: 'User does not have this URL group assigned' },
        { status: 404 }
      );
    }

    // Remove the user-URL group mapping
    await prisma.userUrlGroup.delete({
      where: {
        userId_urlGroupId: {
          userId,
          urlGroupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing URL group from user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
