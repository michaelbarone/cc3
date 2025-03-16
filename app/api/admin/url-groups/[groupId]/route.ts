import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    groupId: string;
  };
}

// Get a specific URL group (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Fetch the URL group with its URLs
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
      include: {
        urls: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ urlGroup });
  } catch (error) {
    console.error('Error fetching URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a URL group (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if the URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingUrlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Update the URL group
    const updatedUrlGroup = await prisma.urlGroup.update({
      where: { id: groupId },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ urlGroup: updatedUrlGroup });
  } catch (error) {
    console.error('Error updating URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a URL group (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;

    // Check if the URL group exists
    const existingUrlGroup = await prisma.urlGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingUrlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Delete all associated URLs first
    await prisma.url.deleteMany({
      where: { urlGroupId: groupId },
    });

    // Delete all user-URL group mappings
    await prisma.userUrlGroup.deleteMany({
      where: { urlGroupId: groupId },
    });

    // Delete the URL group
    await prisma.urlGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
