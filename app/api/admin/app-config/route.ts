import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { DEFAULT_APP_CONFIG } from "@/app/lib/utils/constants";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// GET /api/admin/app-config - Get app configuration
export async function GET() {
  try {
    // Get app config from database
    let appConfig = await prisma.appConfig.findUnique({
      where: { id: "app-config" },
    });

    // If no config exists, create default
    if (!appConfig) {
      appConfig = await prisma.appConfig.create({
        data: {
          id: "app-config",
          appName: DEFAULT_APP_CONFIG.appName,
          loginTheme: DEFAULT_APP_CONFIG.loginTheme,
          registrationEnabled: DEFAULT_APP_CONFIG.registrationEnabled,
          appLogo: DEFAULT_APP_CONFIG.appLogo,
          favicon: DEFAULT_APP_CONFIG.favicon,
        },
      });
    }

    // Always return the app config without requiring authentication
    // This endpoint needs to be accessible for the login page
    return NextResponse.json(appConfig);
  } catch (error) {
    console.error("Error getting app config:", error);
    return NextResponse.json({ error: "Error getting app config" }, { status: 500 });
  }
}

// PATCH /api/admin/app-config - Update app configuration
export async function PATCH(request: NextRequest) {
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

    // Handle file upload
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("logo") as File;

      if (!file) {
        return NextResponse.json({ error: "No logo file provided" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
      }

      const timestamp = Date.now();
      const filename = `app-logo-${timestamp}.webp`;
      const uploadDir = path.join(process.cwd(), "public", "logos");

      try {
        await mkdir(uploadDir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadDir, filename), buffer);

        const appConfig = await prisma.appConfig.update({
          where: { id: "app-config" },
          data: { appLogo: `/logos/${filename}` },
        });

        return NextResponse.json(appConfig);
      } catch (error) {
        console.error("Error uploading logo:", error);
        return NextResponse.json({ error: "Error uploading logo" }, { status: 500 });
      }
    }

    // Handle JSON updates
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const updates: any = {};

    // Handle app name update
    if (body.appName !== undefined) {
      if (!body.appName || body.appName.trim().length === 0) {
        return NextResponse.json({ error: "App name cannot be empty" }, { status: 400 });
      }
      updates.appName = body.appName.trim();
    }

    // Handle login theme update
    if (body.loginTheme !== undefined) {
      if (!["light", "dark"].includes(body.loginTheme)) {
        return NextResponse.json({ error: "Invalid theme value" }, { status: 400 });
      }
      updates.loginTheme = body.loginTheme;
    }

    // Handle registration enabled update
    if (body.registrationEnabled !== undefined) {
      if (typeof body.registrationEnabled !== "boolean") {
        return NextResponse.json({ error: "Invalid registration enabled value" }, { status: 400 });
      }
      updates.registrationEnabled = body.registrationEnabled;
    }

    // Handle logo deletion
    if (body.appLogo === null) {
      const appConfig = await prisma.appConfig.update({
        where: { id: "app-config" },
        data: { appLogo: null },
      });
      return NextResponse.json(appConfig);
    }

    // If no valid updates, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    // Update app config
    const appConfig = await prisma.appConfig.upsert({
      where: { id: "app-config" },
      update: updates,
      create: {
        id: "app-config",
        appName: updates.appName || "Control Center",
        appLogo: updates.appLogo || null,
        loginTheme: updates.loginTheme || "dark",
        registrationEnabled: updates.registrationEnabled || false,
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error("Error updating app config:", error);
    return NextResponse.json({ error: "Error updating app config" }, { status: 500 });
  }
}
