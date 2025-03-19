import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";

// PATCH /api/admin/app-config/theme - Update login theme
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

    // Parse request body
    const { loginTheme } = await request.json();

    // Validate input
    if (!loginTheme || (loginTheme !== "light" && loginTheme !== "dark")) {
      return NextResponse.json(
        { error: "Valid login theme (light or dark) is required" },
        { status: 400 },
      );
    }

    // Update app config
    const appConfig = await prisma.appConfig.upsert({
      where: { id: "app-config" },
      update: { loginTheme },
      create: {
        appName: "Control Center",
        appLogo: null,
        loginTheme,
      },
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error("Error updating login theme:", error);
    return NextResponse.json({ error: "Error updating login theme" }, { status: 500 });
  }
}
