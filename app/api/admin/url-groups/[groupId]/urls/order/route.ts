import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

interface RouteParams {
  params: {
    groupId: string;
  };
}

interface UrlOrder {
  id: string;
  displayOrder: number;
}

// Update the display order of URLs in a group (admin only)
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
    const { urlOrders } = await request.json();

    if (!Array.isArray(urlOrders) || urlOrders.length === 0) {
      return NextResponse.json(
        { error: 'URL orders array is required' },
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

    // Validate that all URLs exist in the group
    const existingUrls = await prisma.url.findMany({
      where: {
        urlGroupId: groupId,
        id: {
          in: urlOrders.map((item: UrlOrder) => item.id),
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUrls.length !== urlOrders.length) {
      return NextResponse.json(
        { error: 'One or more URLs not found in this group' },
        { status: 404 }
      );
    }

    // Update the display order for each URL
    const updatePromises = urlOrders.map((item: UrlOrder) =>
      prisma.url.update({
        where: {
          id: item.id,
        },
        data: {
          displayOrder: item.displayOrder,
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating URL display order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
