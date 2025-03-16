import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

// Define a type for a URL
interface Url {
  id: string;
  title: string;
  url: string;
  iconPath: string | null;
  displayOrder: number;
}

// Define a type for a URL group
interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  urls: Url[];
}

interface UserUrlGroupItem {
  urlGroup: {
    id: string;
    name: string;
    description: string | null;
    urls: {
      id: string;
      title: string;
      url: string;
      iconPath: string | null;
      displayOrder: number;
    }[];
  };
}

export async function GET() {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all URL groups assigned to the user
    const userUrlGroups = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        userUrlGroups: {
          select: {
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
        },
      },
    });

    if (!userUrlGroups) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform the data to a more frontend-friendly format
    const urlGroups = userUrlGroups.userUrlGroups.map((item: UserUrlGroupItem) => {
      const { urlGroup } = item;
      return {
        id: urlGroup.id,
        name: urlGroup.name,
        description: urlGroup.description,
        urls: urlGroup.urls.map((url) => ({
          id: url.id,
          title: url.title,
          url: url.url,
          iconPath: url.iconPath,
          displayOrder: url.displayOrder,
        })),
      } as UrlGroup;
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
