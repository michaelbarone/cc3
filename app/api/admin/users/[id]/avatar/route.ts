import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// We can't use the Route Handler API's bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

// POST /api/admin/users/[id]/avatar - Upload avatar for a specific user
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin access
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    // Get the target user data from the database
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Process file upload
    const formData = await request.formData();
    const avatarFile = formData.get("avatar") as File | null;

    if (!avatarFile || !(avatarFile instanceof File)) {
      return NextResponse.json({ error: "No avatar file provided" }, { status: 400 });
    }

    // Check file size (max 2MB)
    if (avatarFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Check file type
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Generate a unique filename
    const filename = `${user.id}-${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), "public/avatars", filename);

    // Create avatars directory if it doesn't exist
    await fs.mkdir(path.join(process.cwd(), "public/avatars"), { recursive: true });

    // Process and save the image
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    await sharp(buffer)
      .resize(250, 250) // Resize to 250x250px
      .webp({ quality: 80 }) // Convert to WebP format
      .toFile(filepath);

    // Public URL for the avatar
    const avatarUrl = `/avatars/${filename}`;

    // Delete old avatar if it exists
    if (user.avatarUrl) {
      try {
        const oldAvatarPath = path.join(
          process.cwd(),
          "public",
          user.avatarUrl.startsWith("/") ? user.avatarUrl.substring(1) : user.avatarUrl,
        );
        await fs.access(oldAvatarPath);
        await fs.unlink(oldAvatarPath);
      } catch (error) {
        // Ignore errors if the file doesn't exist or can't be deleted
        console.warn("Could not delete old avatar:", error);
      }
    }

    // Update the user record with the new avatar URL
    await prisma.user.update({
      where: { id },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Error uploading avatar" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]/avatar - Delete avatar for a specific user
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin access
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    // Get the target user data from the database
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    if (!user?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the user has an avatar
    if (!user.avatarUrl) {
      return NextResponse.json({ error: "User does not have an avatar" }, { status: 400 });
    }

    // Delete the avatar file
    try {
      const avatarPath = path.join(
        process.cwd(),
        "public",
        user.avatarUrl.startsWith("/") ? user.avatarUrl.substring(1) : user.avatarUrl,
      );
      await fs.access(avatarPath);
      await fs.unlink(avatarPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist or can't be deleted
      console.warn("Could not delete avatar file:", error);
    }

    // Update the user record to remove the avatar URL
    await prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json({ error: "Error deleting avatar" }, { status: 500 });
  }
}
