import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    groupId: string;
  };
}

// Get all URLs in a group (admin only)
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

    // Fetch all URLs in the group
    const urls = await prisma.url.findMany({
      where: { urlGroupId: groupId },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ urls });
  } catch (error) {
    console.error('Error fetching URLs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new URL in a group (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { groupId } = params;
    const { title, url, iconPath, displayOrder } = await request.json();

    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
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

    // Get the highest display order if not provided
    let finalDisplayOrder = displayOrder;
    if (finalDisplayOrder === undefined) {
      const highestOrderUrl = await prisma.url.findFirst({
        where: { urlGroupId: groupId },
        orderBy: { displayOrder: 'desc' },
      });

      finalDisplayOrder = highestOrderUrl ? highestOrderUrl.displayOrder + 1 : 0;
    }

    // Create the new URL
    const newUrl = await prisma.url.create({
      data: {
        title,
        url,
        iconPath,
        displayOrder: finalDisplayOrder,
        urlGroupId: groupId,
      },
    });

    return NextResponse.json({ url: newUrl });
  } catch (error) {
    console.error('Error creating URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
