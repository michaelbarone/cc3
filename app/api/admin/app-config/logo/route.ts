import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// We can't use the Route Handler API's bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET /api/admin/app-config/logo - Get app logo
export async function GET() {
  try {
    // Get app config from database
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' },
    });

    // If no logo is set, return 404
    if (!appConfig?.appLogo) {
      return NextResponse.json(
        { error: 'No logo found' },
        { status: 404 }
      );
    }

    // Redirect to the logo file in public directory
    return NextResponse.redirect(new URL(appConfig.appLogo, process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      : 'http://localhost:3000'));
  } catch (error) {
    console.error('Error getting app logo:', error);
    return NextResponse.json(
      { error: 'Error getting app logo' },
      { status: 500 }
    );
  }
}

// POST /api/admin/app-config/logo - Upload app logo
export async function POST(request: NextRequest) {
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

    // Process file upload
    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;

    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json(
        { error: 'No logo file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 1MB)
    if (logoFile.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 1MB)' },
        { status: 400 }
      );
    }

    // Check file type
    if (!logoFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const filename = `app-logo-${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), 'public/logos', filename);

    // Create logos directory if it doesn't exist
    await fs.mkdir(path.join(process.cwd(), 'public/logos'), { recursive: true });

    // Process and save the image
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    await sharp(buffer)
      .resize(200, 60, { fit: 'inside' }) // Resize to fit within 200x60px
      .webp({ quality: 90 }) // Convert to WebP format
      .toFile(filepath);

    // Public URL for the logo
    const appLogo = `/logos/${filename}`;

    // Get current app config
    const currentConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' },
    });

    // Delete old logo if it exists
    if (currentConfig?.appLogo) {
      try {
        const oldLogoPath = path.join(
          process.cwd(),
          'public',
          currentConfig.appLogo.startsWith('/') ? currentConfig.appLogo.substring(1) : currentConfig.appLogo
        );
        await fs.access(oldLogoPath);
        await fs.unlink(oldLogoPath);
      } catch (error) {
        // Ignore errors if the file doesn't exist or can't be deleted
        console.warn('Could not delete old logo:', error);
      }
    }

    // Update app config with new logo URL
    const appConfig = await prisma.appConfig.upsert({
      where: { id: 'app-config' },
      update: { appLogo },
      create: {
        appName: 'URL Dashboard',
        appLogo,
        loginTheme: 'dark',  // Default to dark theme
        registrationEnabled: false, // Default to disabled registration
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error uploading app logo:', error);
    return NextResponse.json(
      { error: 'Error uploading app logo' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/app-config/logo - Delete app logo
export async function DELETE() {
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

    // Get current app config
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' },
    });

    // Check if app has a logo
    if (!appConfig?.appLogo) {
      return NextResponse.json(
        { error: 'App does not have a logo' },
        { status: 400 }
      );
    }

    // Delete the logo file
    try {
      const logoPath = path.join(
        process.cwd(),
        'public',
        appConfig.appLogo.startsWith('/') ? appConfig.appLogo.substring(1) : appConfig.appLogo
      );
      await fs.access(logoPath);
      await fs.unlink(logoPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist or can't be deleted
      console.warn('Could not delete logo file:', error);
    }

    // Update app config to remove the logo URL
    const updatedConfig = await prisma.appConfig.update({
      where: { id: 'app-config' },
      data: { appLogo: null },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error deleting app logo:', error);
    return NextResponse.json(
      { error: 'Error deleting app logo' },
      { status: 500 }
    );
  }
}
