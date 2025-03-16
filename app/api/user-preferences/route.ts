import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

// GET /api/user-preferences - Get all user preferences
export async function GET() {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with all their preferences
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        lastActiveUrl: true,
        // Add other user preferences here as they are added to the schema
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      preferences: {
        lastActiveUrl: userData.lastActiveUrl,
        // Add other preferences here
      }
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allowed preferences type
type AllowedPreference = 'lastActiveUrl' | 'theme' | 'language' | 'menuPosition';

// POST /api/user-preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate the preferences data
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences data' },
        { status: 400 }
      );
    }

    // Create an update object with only valid preference fields
    const updateData: Record<AllowedPreference, string | null> = {} as Record<AllowedPreference, string | null>;

    // Whitelist of allowed preference fields
    const allowedPreferences: AllowedPreference[] = ['lastActiveUrl', 'theme', 'language', 'menuPosition'];

    // Only include fields that are in the allowed list
    for (const key of allowedPreferences) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // Update the user preferences
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
