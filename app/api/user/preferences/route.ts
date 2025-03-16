import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db/prisma';
import { verifyToken } from '@/app/lib/auth/jwt';

// GET handler to fetch user preferences
export async function GET() {
  try {
    // Verify the user's token
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user with their preferences
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        menuPosition: true,
        themeMode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return the user preferences, using database defaults if values are null
    // This ensures we use what's in the database instead of hardcoding defaults
    return NextResponse.json({
      preferences: {
        menuPosition: user.menuPosition || 'side',
        themeMode: user.themeMode || 'light',
      },
      rawPreferences: user, // Include raw data for debugging
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// POST handler to update user preferences
export async function POST(request: NextRequest) {
  try {
    // Verify the user's token
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user data first
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        menuPosition: true,
        themeMode: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();
    const { menuPosition, themeMode } = body;

    // Prepare update data with type safety
    const updateData: { menuPosition?: string; themeMode?: string } = {};

    // Validate the menu position if provided
    if (menuPosition !== undefined) {
      if (!['side', 'top'].includes(menuPosition)) {
        return NextResponse.json(
          { error: 'Invalid menu position. Must be "side" or "top".' },
          { status: 400 }
        );
      }
      updateData.menuPosition = menuPosition;
      console.log(`Updating menu position from ${currentUser.menuPosition} to ${menuPosition}`);
    }

    // Validate the theme mode if provided
    if (themeMode !== undefined) {
      if (!['light', 'dark'].includes(themeMode)) {
        return NextResponse.json(
          { error: 'Invalid theme mode. Must be "light" or "dark".' },
          { status: 400 }
        );
      }
      updateData.themeMode = themeMode;
      console.log(`Updating theme mode from ${currentUser.themeMode} to ${themeMode}`);
    }

    // If no valid update data, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid preferences provided for update.' },
        { status: 400 }
      );
    }

    // Update the user's preferences
    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: updateData,
      select: {
        id: true,
        menuPosition: true,
        themeMode: true,
      },
    });

    // Return the updated preferences
    return NextResponse.json({
      preferences: {
        menuPosition: updatedUser.menuPosition || 'side',
        themeMode: updatedUser.themeMode || 'light',
      },
      rawPreferences: updatedUser, // Include raw data for debugging
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
