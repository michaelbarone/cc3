import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
    urlGroupId: string;
  };
}

// Check if a user has a specific URL group assigned (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
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

    // Check if the user is assigned to the URL group
    const userUrlGroup = await prisma.userUrlGroup.findUnique({
      where: {
        userId_urlGroupId: {
          userId: id,
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
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
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
          userId: id,
          urlGroupId,
        },
      },
      update: {},
      create: {
        userId: id,
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
    const user = await verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id, urlGroupId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
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

    // Delete the user-URL group mapping if it exists
    await prisma.userUrlGroup.deleteMany({
      where: {
        userId_urlGroupId: {
          userId: id,
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
