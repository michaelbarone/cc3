import { prisma } from "@/lib/db/prisma";
import { createFavicon, createLogo } from "@/lib/services/brandingService";
import formidable from "formidable";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse multipart form data
 */
async function parseFormData(req: NextRequest) {
  const formData = await req.formData();
  const fileType = formData.get("fileType") as string;
  const file = formData.get("file") as File;

  if (!file || !fileType) {
    throw new Error("File and fileType are required");
  }

  // Create a formidable File object compatible with our services
  const tempPath = join(process.cwd(), "tmp", `${Date.now()}-${file.name}`);

  // Ensure tmp directory exists
  const tmpDir = join(process.cwd(), "tmp");
  if (!existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
  }

  // Write the file to a temporary location
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(tempPath, buffer);

  // Create a custom object that matches the properties we need from formidable.File
  // Without having to satisfy the entire interface
  const formidableCompatibleFile = {
    filepath: tempPath,
    originalFilename: file.name,
    newFilename: file.name,
    mimetype: file.type,
    size: file.size,
    // Add required methods
    toJSON: () => ({
      size: file.size,
      filepath: tempPath,
      newFilename: file.name,
      mimetype: file.type,
    }),
  };

  // We're telling TypeScript to trust us that this object can be used as a formidable.File
  return { fileType, file: formidableCompatibleFile as unknown as formidable.File };
}

/**
 * POST /api/admin/branding/upload
 *
 * Upload a branding image (logo or favicon)
 */
export async function POST(req: NextRequest) {
  try {
    // Ensure branding directory exists
    const brandingDir = join(process.cwd(), "public", "branding");
    if (!existsSync(brandingDir)) {
      await mkdir(brandingDir, { recursive: true });
    }

    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Check if the user is an admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Parse the form data
    const { fileType, file } = await parseFormData(req);

    let result;

    // Process the file based on type
    if (fileType === "logo") {
      // Check file size (max 1MB)
      if (file.size > 1024 * 1024) {
        return NextResponse.json(
          { message: "Logo file size exceeds the maximum limit of 1MB" },
          { status: 400 },
        );
      }

      result = await createLogo(file);

      // Update the logoPath in SystemSetting
      await prisma.systemSetting.upsert({
        where: { key: "logoPath" },
        update: { value: result.logoPath },
        create: {
          key: "logoPath",
          value: result.logoPath,
        },
      });

      return NextResponse.json(
        { message: "Logo uploaded successfully", logoPath: result.logoPath },
        { status: 200 },
      );
    } else if (fileType === "favicon") {
      // Check file size (max 100KB)
      if (file.size > 100 * 1024) {
        return NextResponse.json(
          { message: "Favicon file size exceeds the maximum limit of 100KB" },
          { status: 400 },
        );
      }

      result = await createFavicon(file);

      // Update the faviconPath in SystemSetting
      await prisma.systemSetting.upsert({
        where: { key: "faviconPath" },
        update: { value: result.faviconPath },
        create: {
          key: "faviconPath",
          value: result.faviconPath,
        },
      });

      return NextResponse.json(
        { message: "Favicon uploaded successfully", faviconPath: result.faviconPath },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { message: "Invalid file type. Expected 'logo' or 'favicon'" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error uploading branding image:", error);
    return NextResponse.json(
      { message: "An error occurred while uploading the image" },
      { status: 500 },
    );
  }
}
