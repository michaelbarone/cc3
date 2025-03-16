import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';
import { cookies } from 'next/headers';

// Get all URLs (admin only)
export async function GET() {
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

    // Get all URLs
    const urls = await prisma.url.findMany({
      orderBy: {
        title: 'asc'
      }
    });

    return NextResponse.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Create a new URL (admin only)
export async function POST(request: Request) {
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

    // Parse request body
    const { title, url, urlMobile, iconPath, idleTimeout } = await request.json();

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

    // Create new URL
    const newUrl = await prisma.url.create({
      data: {
        title,
        url,
        urlMobile: urlMobile || null,
        iconPath: iconPath || null,
        idleTimeoutMinutes: idleTimeout || null
      }
    });

    return NextResponse.json(newUrl, { status: 201 });
  } catch (error) {
    console.error('Error creating URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
