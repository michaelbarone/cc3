import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/auth/jwt';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// PATCH - Update a URL
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; urlId: string } }
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

    const { id: urlGroupId, urlId } = params;

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

    // Check if URL exists in the group
    const existingUrl = await prisma.url.findFirst({
      where: {
        id: urlId,
        urlGroupId
      }
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found in this group' },
        { status: 404 }
      );
    }

    // Parse request body
    const { title, url, iconPath, displayOrder, idleTimeoutMinutes } = await request.json();

    // Validate required input
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

    // Convert idleTimeoutMinutes to number or use default
    let timeoutMinutes = 10; // Default
    if (idleTimeoutMinutes !== undefined) {
      timeoutMinutes = Number(idleTimeoutMinutes);
      if (isNaN(timeoutMinutes) || timeoutMinutes < 0) {
        return NextResponse.json(
          { error: 'Idle timeout must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // Update URL
    const updatedUrl = await prisma.url.update({
      where: { id: urlId },
      data: {
        title,
        url,
        iconPath: iconPath || null,
        displayOrder: displayOrder !== undefined ? displayOrder : existingUrl.displayOrder,
        idleTimeoutMinutes: timeoutMinutes
      }
    });

    return NextResponse.json(updatedUrl);
  } catch (error) {
    console.error('Error updating URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Remove a URL
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; urlId: string } }
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

    const { id: urlGroupId, urlId } = params;

    // Check if URL exists in the specified group
    const existingUrl = await prisma.url.findFirst({
      where: {
        id: urlId,
        urlGroupId
      }
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found in this group' },
        { status: 404 }
      );
    }

    // Delete URL
    await prisma.url.delete({
      where: { id: urlId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
