import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

// GET /api/admin/app-config - Get app configuration
export async function GET() {
  try {
    // Get app config from database
    let appConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' },
    });

    // If no config exists, create default
    if (!appConfig) {
      appConfig = await prisma.appConfig.create({
        data: {
          appName: 'Control Center',
          appLogo: null,
          loginTheme: 'dark',  // Default to dark theme
          registrationEnabled: false, // Default to disabled registration
        },
      });
    }

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error getting app config:', error);
    return NextResponse.json(
      { error: 'Error getting app configuration' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/app-config - Update app name
export async function PATCH(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const tokenPayload = await verifyToken();
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    if (!tokenPayload.isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { appName } = await request.json();

    // Validate input
    if (!appName || appName.trim().length === 0) {
      return NextResponse.json(
        { error: 'App name is required' },
        { status: 400 }
      );
    }

    // Update app config
    const appConfig = await prisma.appConfig.upsert({
      where: { id: 'app-config' },
      update: { appName },
      create: {
        appName,
        appLogo: null,
        loginTheme: 'dark',  // Default to dark theme
        registrationEnabled: false, // Default to disabled registration
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error updating app config:', error);
    return NextResponse.json(
      { error: 'Error updating app configuration' },
      { status: 500 }
    );
  }
}
