import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/auth/jwt';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// POST - Create a new URL within a URL group
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: urlGroupId } = params;

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id: urlGroupId }
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { title, url, iconPath, displayOrder } = await request.json();

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!url || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Determine display order if not provided
    let finalDisplayOrder = displayOrder;
    if (finalDisplayOrder === undefined) {
      // Get highest existing display order
      const highestOrderUrl = await prisma.url.findFirst({
        where: { urlGroupId },
        orderBy: { displayOrder: 'desc' }
      });

      finalDisplayOrder = highestOrderUrl ? highestOrderUrl.displayOrder + 1 : 0;
    }

    // Create new URL
    const newUrl = await prisma.url.create({
      data: {
        urlGroupId,
        title,
        url,
        iconPath: iconPath || null,
        displayOrder: finalDisplayOrder
      }
    });

    return NextResponse.json(newUrl, { status: 201 });
  } catch (error) {
    console.error('Error creating URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
