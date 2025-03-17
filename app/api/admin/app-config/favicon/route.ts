import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// POST /api/admin/app-config/favicon - Upload favicon
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
    const faviconFile = formData.get('favicon') as File | null;

    if (!faviconFile || !(faviconFile instanceof File)) {
      return NextResponse.json(
        { error: 'No favicon file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 100KB)
    if (faviconFile.size > 100 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 100KB)' },
        { status: 400 }
      );
    }

    // Check file type
    if (!faviconFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const filename = `favicon-${Date.now()}.ico`;
    const filepath = path.join(process.cwd(), 'public', filename);

    // Process and save the image
    const buffer = Buffer.from(await faviconFile.arrayBuffer());
    await sharp(buffer)
      .resize(32, 32) // Standard favicon size
      .toFile(filepath);

    // Public URL for the favicon
    const favicon = `/${filename}`;

    // Get current app config
    const currentConfig = await prisma.appConfig.findUnique({
      where: { id: 'app-config' },
    });

    // Delete old favicon if it exists
    if (currentConfig?.favicon) {
      try {
        const oldFaviconPath = path.join(
          process.cwd(),
          'public',
          currentConfig.favicon.startsWith('/') ? currentConfig.favicon.substring(1) : currentConfig.favicon
        );
        await fs.access(oldFaviconPath);
        await fs.unlink(oldFaviconPath);
      } catch (error) {
        // Ignore errors if the file doesn't exist or can't be deleted
        console.warn('Could not delete old favicon:', error);
      }
    }

    // Update app config with new favicon URL
    const appConfig = await prisma.appConfig.upsert({
      where: { id: 'app-config' },
      update: { favicon },
      create: {
        appName: 'Control Center',
        favicon,
        loginTheme: 'dark',
        registrationEnabled: false,
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error uploading favicon:', error);
    return NextResponse.json(
      { error: 'Error uploading favicon' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/app-config/favicon - Delete favicon
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

    // Check if app has a favicon
    if (!appConfig?.favicon) {
      return NextResponse.json(
        { error: 'App does not have a favicon' },
        { status: 400 }
      );
    }

    // Delete the favicon file
    try {
      const faviconPath = path.join(
        process.cwd(),
        'public',
        appConfig.favicon.startsWith('/') ? appConfig.favicon.substring(1) : appConfig.favicon
      );
      await fs.access(faviconPath);
      await fs.unlink(faviconPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist or can't be deleted
      console.warn('Could not delete favicon file:', error);
    }

    // Update app config to remove the favicon URL
    const updatedConfig = await prisma.appConfig.update({
      where: { id: 'app-config' },
      data: { favicon: null },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error deleting favicon:', error);
    return NextResponse.json(
      { error: 'Error deleting favicon' },
      { status: 500 }
    );
  }
}
