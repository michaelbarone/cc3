import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth/jwt";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

// We can't use the Route Handler API's bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Handle icon uploads for URLs
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const tokenPayload = await verifyToken();
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin permissions
    if (!tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    // Process file upload
    const formData = await request.formData();
    const iconFile = formData.get("icon") as File | null;

    if (!iconFile || !(iconFile instanceof File)) {
      return NextResponse.json({ error: "No icon file provided" }, { status: 400 });
    }

    // Check file size (max 1MB)
    if (iconFile.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 1MB)" }, { status: 400 });
    }

    // Check file type
    if (!iconFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Generate a unique filename
    const filename = `icon-${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), "public/icons", filename);

    // Create icons directory if it doesn't exist
    await fs.mkdir(path.join(process.cwd(), "public/icons"), { recursive: true });

    // Process and save the image
    const buffer = Buffer.from(await iconFile.arrayBuffer());
    await sharp(buffer)
      .resize(60, 60) // Resize to 60x60px
      .webp({ quality: 80 }) // Convert to WebP format
      .toFile(filepath);

    // Public URL for the icon
    const iconUrl = `/icons/${filename}`;

    return NextResponse.json({ iconUrl });
  } catch (error) {
    console.error("Error uploading icon:", error);
    return NextResponse.json({ error: "Error uploading icon" }, { status: 500 });
  }
}

// DELETE /api/admin/icons?iconPath=path
export async function DELETE(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const tokenPayload = await verifyToken();
    if (!tokenPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin permissions
    if (!tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    // Get icon path from query parameters
    const iconPath = request.nextUrl.searchParams.get("iconPath");

    if (!iconPath) {
      return NextResponse.json({ error: "Icon path is required" }, { status: 400 });
    }

    // Delete the icon file
    try {
      const fullIconPath = path.join(
        process.cwd(),
        "public",
        iconPath.startsWith("/") ? iconPath.substring(1) : iconPath,
      );
      await fs.access(fullIconPath);
      await fs.unlink(fullIconPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist or can't be deleted
      console.warn("Could not delete icon file:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting icon:", error);
    return NextResponse.json({ error: "Error deleting icon" }, { status: 500 });
  }
}
