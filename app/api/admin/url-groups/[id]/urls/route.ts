import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/app/lib/auth/jwt';
import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/db/prisma';

const prismaClient = new PrismaClient();

// POST - Create a new URL within a URL group
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const urlGroupId = await params.id;

    // Check if URL group exists
    const urlGroup = await prismaClient.urlGroup.findUnique({
      where: { id: urlGroupId }
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { title, url, iconPath, displayOrder, idleTimeoutMinutes } = await request.json();

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

    // Normalize URLs by removing trailing slashes and converting to lowercase
    const normalizeUrl = (inputUrl: string): string => {
      let normalized = inputUrl.toLowerCase().trim();
      // Remove trailing slashes
      normalized = normalized.replace(/\/+$/, '');
      // Remove http:// or https:// from the start
      normalized = normalized.replace(/^https?:\/\//, '');
      return normalized;
    };

    const normalizedNewUrl = normalizeUrl(url);

    // Check for existing URLs with exact or partial matches
    const searchParams = new URL(request.url).searchParams;
    const force = searchParams.get('force') === 'true';

    if (!force) {
      const existingUrls = await prismaClient.url.findMany({
        where: {
          OR: [
            // Exact match after normalization
            { url: { contains: normalizedNewUrl } },
            // Also check if the normalized version of existing URLs match
            {
              url: {
                contains: normalizedNewUrl.replace(/^https?:\/\//, '')
              }
            }
          ]
        },
        select: {
          id: true,
          title: true,
          url: true,
          urlGroupId: true
        }
      });

      // Filter out false positives by doing a more precise comparison
      const matches = existingUrls.filter(existingUrl => {
        const normalizedExistingUrl = normalizeUrl(existingUrl.url);
        return (
          normalizedExistingUrl === normalizedNewUrl ||
          normalizedExistingUrl.includes(normalizedNewUrl) ||
          normalizedNewUrl.includes(normalizedExistingUrl)
        );
      });

      if (matches.length > 0) {
        // Return the matches with their details
        return NextResponse.json({
          warning: 'Similar URLs found',
          matches: matches.map(u => ({
            id: u.id,
            title: u.title,
            url: u.url,
            inGroup: !!u.urlGroupId
          })),
          exactMatch: matches.some(u => normalizeUrl(u.url) === normalizedNewUrl)
        }, { status: 409 });
      }
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

    // Determine display order if not provided
    let finalDisplayOrder = displayOrder;
    if (finalDisplayOrder === undefined) {
      // Get highest existing display order
      const highestOrderUrl = await prismaClient.url.findFirst({
        where: { urlGroupId },
        orderBy: { displayOrder: 'desc' }
      });

      finalDisplayOrder = highestOrderUrl ? highestOrderUrl.displayOrder + 1 : 0;
    }

    // Create new URL
    const newUrl = await prismaClient.url.create({
      data: {
        urlGroupId,
        title,
        url,
        iconPath: iconPath || null,
        displayOrder: finalDisplayOrder,
        idleTimeoutMinutes: timeoutMinutes
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
    await prismaClient.$disconnect();
  }
}

// PUT - Update URLs in a group
export async function PUT(
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

    const { id } = params;
    const { urlIds } = await request.json();

    // Check if URL group exists
    const urlGroup = await prisma.urlGroup.findUnique({
      where: { id }
    });

    if (!urlGroup) {
      return NextResponse.json(
        { error: 'URL group not found' },
        { status: 404 }
      );
    }

    // Update URLs in the group
    // First, get all URLs currently in the group
    const currentUrls = await prisma.url.findMany({
      where: { urlGroupId: id }
    });

    // Create a transaction for all updates
    const updates = [];

    // Remove urlGroupId from current URLs that are not in the new selection
    if (currentUrls.length > 0) {
      updates.push(
        prisma.url.updateMany({
          where: {
            urlGroupId: id,
            id: { notIn: urlIds }
          },
          data: {
            urlGroupId: ''  // Using empty string instead of null
          }
        })
      );
    }

    // Add urlGroupId to new URLs
    if (urlIds.length > 0) {
      updates.push(
        prisma.url.updateMany({
          where: {
            id: { in: urlIds }
          },
          data: {
            urlGroupId: id
          }
        })
      );
    }

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    // Get the updated URL group with its URLs
    const updatedUrlGroup = await prisma.urlGroup.findUnique({
      where: { id },
      include: {
        urls: {
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    return NextResponse.json(updatedUrlGroup);
  } catch (error) {
    console.error('Error updating URLs in group:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
