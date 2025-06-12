import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";

// Define favicon paths
const PUBLIC_DIR = path.join(process.cwd(), "public");
const DEFAULT_FAVICON_PATH = path.join(PUBLIC_DIR, "favicon-default.png");
const CUSTOM_FAVICON_PATH = path.join(PUBLIC_DIR, "favicon-custom.png");
const ACTIVE_FAVICON_PATH = path.join(PUBLIC_DIR, "favicon.ico");

// Helper to check if custom favicon exists
async function doesCustomFaviconExist(): Promise<boolean> {
  try {
    await fs.access(CUSTOM_FAVICON_PATH);
    return true;
  } catch {
    return false;
  }
}

// POST /api/admin/app-config/favicon - Upload custom favicon
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
    const faviconFile = formData.get("favicon") as File | null;

    if (!faviconFile || !(faviconFile instanceof File)) {
      return NextResponse.json({ error: "No favicon file provided" }, { status: 400 });
    }

    // Check file size (max 100KB)
    if (faviconFile.size > 100 * 1024) {
      return NextResponse.json({ error: "File too large (max 100KB)" }, { status: 400 });
    }

    // Check file type
    if (!faviconFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Process the image
    const buffer = Buffer.from(await faviconFile.arrayBuffer());

    try {
      // Save the custom favicon (for backup/history)
      await sharp(buffer).resize(32, 32).png().toFile(CUSTOM_FAVICON_PATH);

      // For favicon.ico, we'll use the PNG since modern browsers support it
      // and just copy it to the standard location
      await fs.copyFile(CUSTOM_FAVICON_PATH, ACTIVE_FAVICON_PATH);
    } catch (error) {
      console.error("Sharp processing error:", error);
      return NextResponse.json(
        {
          error: `Image processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 },
      );
    }

    // For backward compatibility with the existing frontend, we'll update the database as well
    // This helps during the transition to the file-based approach
    const appConfig = await prisma.appConfig.upsert({
      where: { id: "app-config" },
      update: { favicon: "/favicon-custom.png" },
      create: {
        appName: "Control Center",
        favicon: "/favicon-custom.png",
        loginTheme: "dark",
        registrationEnabled: false,
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error("Error uploading favicon:", error);
    return NextResponse.json({ error: "Error uploading favicon" }, { status: 500 });
  }
}

// DELETE /api/admin/app-config/favicon - Restore default favicon
export async function DELETE() {
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

    try {
      // Check if custom favicon exists and delete it
      const customFaviconExists = await doesCustomFaviconExist();
      if (customFaviconExists) {
        await fs.unlink(CUSTOM_FAVICON_PATH);
        console.log("Deleted custom favicon");
      } else {
        console.log("No custom favicon to delete");
      }

      // Copy default favicon to active location
      await fs.copyFile(DEFAULT_FAVICON_PATH, ACTIVE_FAVICON_PATH);

      // For backward compatibility with the existing frontend, we'll update the database as well
      const appConfig = await prisma.appConfig.update({
        where: { id: "app-config" },
        data: { favicon: null }, // Setting to null makes UI use the default
      });

      return NextResponse.json(appConfig);
    } catch (error) {
      console.error("Error restoring default favicon:", error);
      return NextResponse.json({ error: "Error restoring default favicon" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error resetting to default favicon:", error);
    return NextResponse.json({ error: "Error resetting to default favicon" }, { status: 500 });
  }
}
