import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';
import { PrismaClient } from '@prisma/client';

interface RouteParams {
  params: {
    userId: string;
  };
}

// Define types for the data structures
interface UrlData {
  id: string;
  title: string;
  url: string;
  iconPath: string | null;
  displayOrder: number;
}

interface UrlGroupData {
  id: string;
  name: string;
  description: string | null;
  urls: UrlData[];
}

interface UserUrlGroupWithData {
  urlGroup: UrlGroupData;
}

// Get all URL groups assigned to a user (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch all URL groups assigned to the user
    const userUrlGroups = await prisma.userUrlGroup.findMany({
      where: { userId },
      include: {
        urlGroup: {
          include: {
            urls: {
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
      },
    }) as unknown as UserUrlGroupWithData[];

    // Transform the data to a more frontend-friendly format
    const urlGroups = userUrlGroups.map(({ urlGroup }: UserUrlGroupWithData) => ({
      id: urlGroup.id,
      name: urlGroup.name,
      description: urlGroup.description,
      urls: urlGroup.urls.map((url: UrlData) => ({
        id: url.id,
        title: url.title,
        url: url.url,
        iconPath: url.iconPath,
        displayOrder: url.displayOrder,
      })),
    }));

    return NextResponse.json({ urlGroups });
  } catch (error) {
    console.error('Error fetching user URL groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Assign URL groups to a user (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const { urlGroupIds } = await request.json();

    if (!Array.isArray(urlGroupIds) || urlGroupIds.length === 0) {
      return NextResponse.json(
        { error: 'URL group IDs are required' },
        { status: 400 }
      );
    }

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if all URL groups exist
    const urlGroups = await prisma.urlGroup.findMany({
      where: {
        id: {
          in: urlGroupIds,
        },
      },
    });

    if (urlGroups.length !== urlGroupIds.length) {
      return NextResponse.json(
        { error: 'One or more URL groups not found' },
        { status: 404 }
      );
    }

    // Create new user-URL group mappings
    const createPromises = urlGroupIds.map(urlGroupId =>
      prisma.userUrlGroup.upsert({
        where: {
          userId_urlGroupId: {
            userId,
            urlGroupId,
          },
        },
        update: {},
        create: {
          userId,
          urlGroupId,
        },
      })
    );

    await Promise.all(createPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning URL groups to user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Replace all URL group assignments for a user (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = verifyToken();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const { urlGroupIds } = await request.json();

    if (!Array.isArray(urlGroupIds)) {
      return NextResponse.json(
        { error: 'URL group IDs must be an array' },
        { status: 400 }
      );
    }

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if all URL groups exist (if any)
    if (urlGroupIds.length > 0) {
      const urlGroups = await prisma.urlGroup.findMany({
        where: {
          id: {
            in: urlGroupIds,
          },
        },
      });

      if (urlGroups.length !== urlGroupIds.length) {
        return NextResponse.json(
          { error: 'One or more URL groups not found' },
          { status: 404 }
        );
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => {
      // Delete all existing user-URL group mappings
      await tx.userUrlGroup.deleteMany({
        where: { userId },
      });

      // Create new mappings if any
      if (urlGroupIds.length > 0) {
        await tx.userUrlGroup.createMany({
          data: urlGroupIds.map(urlGroupId => ({
            userId,
            urlGroupId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error replacing user URL groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
