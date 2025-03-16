import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    groupId: string;
    urlId: string;
  };
}

// Get a specific URL (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId, urlId } = params;

    // Fetch the URL
    const url = await prisma.url.findFirst({
      where: {
        id: urlId,
        urlGroupId: groupId,
      },
    });

    if (!url) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error fetching URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a URL (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId, urlId } = params;
    const { title, url, iconPath, displayOrder } = await request.json();

    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    // Check if the URL exists in the specified group
    const existingUrl = await prisma.url.findFirst({
      where: {
        id: urlId,
        urlGroupId: groupId,
      },
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    // Update the URL
    const updatedUrl = await prisma.url.update({
      where: { id: urlId },
      data: {
        title,
        url,
        iconPath,
        displayOrder: displayOrder ?? existingUrl.displayOrder,
      },
    });

    return NextResponse.json({ url: updatedUrl });
  } catch (error) {
    console.error('Error updating URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a URL (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId, urlId } = params;

    // Check if the URL exists in the specified group
    const existingUrl = await prisma.url.findFirst({
      where: {
        id: urlId,
        urlGroupId: groupId,
      },
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    // Delete the URL
    await prisma.url.delete({
      where: { id: urlId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
