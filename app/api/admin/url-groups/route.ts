import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

// Get all URL groups (admin only)
export async function GET() {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch all URL groups with their URLs
    const urlGroups = await prisma.urlGroup.findMany({
      include: {
        urls: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    return NextResponse.json({ urlGroups });
  } catch (error) {
    console.error('Error fetching URL groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new URL group (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create the new URL group
    const urlGroup = await prisma.urlGroup.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ urlGroup });
  } catch (error) {
    console.error('Error creating URL group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
