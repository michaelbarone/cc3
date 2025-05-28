import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for settings update
const UpdateSettingsSchema = z.object({
  allowAdminUserCreation: z.boolean().optional(),
  appName: z.string().min(1).max(50).optional(),
  logoPath: z.string().nullable().optional(),
  faviconPath: z.string().nullable().optional(),
  logRetentionDays: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/settings
 *
 * Retrieve all system settings
 */
export async function GET(req: NextRequest) {
  try {
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

    // Retrieve all settings
    const settingsRecords = await prisma.systemSetting.findMany();

    // Convert to key-value object
    const settings: Record<string, string> = {};
    settingsRecords.forEach((record) => {
      settings[record.key] = record.value;
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching settings" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/settings
 *
 * Update system settings
 */
export async function PUT(req: NextRequest) {
  try {
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

    // Parse request body
    const body = await req.json();
    const validationResult = UpdateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const { allowAdminUserCreation, appName, logoPath, faviconPath, logRetentionDays } =
      validationResult.data;

    // Update settings in a transaction
    await prisma.$transaction(async (prisma) => {
      // Update allowAdminUserCreation if provided
      if (allowAdminUserCreation !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "allowAdminUserCreation" },
          update: { value: allowAdminUserCreation.toString() },
          create: {
            key: "allowAdminUserCreation",
            value: allowAdminUserCreation.toString(),
          },
        });
      }

      // Update appName if provided
      if (appName !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "appName" },
          update: { value: appName },
          create: {
            key: "appName",
            value: appName,
          },
        });
      }

      // Update logoPath if provided
      if (logoPath !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "logoPath" },
          update: { value: logoPath === null ? "" : logoPath },
          create: {
            key: "logoPath",
            value: logoPath === null ? "" : logoPath,
          },
        });
      }

      // Update faviconPath if provided
      if (faviconPath !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "faviconPath" },
          update: { value: faviconPath === null ? "" : faviconPath },
          create: {
            key: "faviconPath",
            value: faviconPath === null ? "" : faviconPath,
          },
        });
      }

      // Update logRetentionDays if provided
      if (logRetentionDays !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key: "logRetentionDays" },
          update: { value: logRetentionDays.toString() },
          create: {
            key: "logRetentionDays",
            value: logRetentionDays.toString(),
          },
        });
      }
    });

    return NextResponse.json({ message: "Settings updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { message: "An error occurred while updating settings" },
      { status: 500 },
    );
  }
}
