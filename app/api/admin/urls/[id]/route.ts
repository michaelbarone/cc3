import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';
import { cookies } from 'next/headers';

// GET - Fetch a specific URL
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userData = await verifyToken();
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get the URL
    const url = await prisma.url.findUnique({
      where: { id }
    });

    if (!url) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(url);
  } catch (error) {
    console.error('Error fetching URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT - Update a URL
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Check if URL exists
    const existingUrl = await prisma.url.findUnique({
      where: { id }
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    const { title, url, urlMobile, iconPath, idleTimeout } = requestData;

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

    // Update URL
    const updatedUrl = await prisma.url.update({
      where: { id },
      data: {
        title,
        url,
        urlMobile: urlMobile || null,
        iconPath: iconPath || null,
        idleTimeoutMinutes: idleTimeout || null
      }
    });

    return NextResponse.json(updatedUrl);
  } catch (error) {
    console.error('Error updating URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a URL
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Check if URL exists
    const existingUrl = await prisma.url.findUnique({
      where: { id }
    });

    if (!existingUrl) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    // Delete URL
    await prisma.url.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
