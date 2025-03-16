import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

// PATCH /api/admin/app-config/registration - Update registration enabled setting
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
    const { registrationEnabled } = await request.json();

    // Validate input
    if (typeof registrationEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Valid registration enabled setting (boolean) is required' },
        { status: 400 }
      );
    }

    // Update app config
    const appConfig = await prisma.appConfig.upsert({
      where: { id: 'app-config' },
      update: { registrationEnabled },
      create: {
        appName: 'URL Dashboard',
        appLogo: null,
        loginTheme: 'dark',
        registrationEnabled,
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error updating registration setting:', error);
    return NextResponse.json(
      { error: 'Error updating registration setting' },
      { status: 500 }
    );
  }
}
