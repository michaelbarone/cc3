import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { AppConfig } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/app-config/password-policy - Get password policy
export async function GET() {
  try {
    const appConfig: AppConfig | null = await prisma.appConfig.findUnique({
      where: { id: "app-config" },
    });

    // If no config exists, return defaults
    if (!appConfig) {
      return NextResponse.json({
        minPasswordLength: 4,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      });
    }

    return NextResponse.json({
      minPasswordLength: appConfig?.minPasswordLength ?? 4,
      requireUppercase: appConfig?.requireUppercase ?? false,
      requireLowercase: appConfig?.requireLowercase ?? false,
      requireNumbers: appConfig?.requireNumbers ?? false,
      requireSpecialChars: appConfig?.requireSpecialChars ?? false,
    });
  } catch (error) {
    console.error("Error getting password policy:", error);
    return NextResponse.json({ error: "Error getting password policy" }, { status: 500 });
  }
}

// PATCH /api/admin/app-config/password-policy - Update password policy
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
    const body = await request.json();
    const updates: any = {};

    // Validate and set minPasswordLength
    if (body.minPasswordLength !== undefined) {
      const minLength = parseInt(body.minPasswordLength, 10);
      if (isNaN(minLength) || minLength < 1 || minLength > 128) {
        return NextResponse.json(
          { error: "Min password length must be between 1 and 128" },
          { status: 400 },
        );
      }
      updates.minPasswordLength = minLength;
    }

    // Validate and set boolean fields
    const booleanFields = [
      "requireUppercase",
      "requireLowercase",
      "requireNumbers",
      "requireSpecialChars",
    ];

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "boolean") {
          return NextResponse.json({ error: `${field} must be a boolean value` }, { status: 400 });
        }
        updates[field] = body[field];
      }
    }

    // If no valid updates, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    // Update app config
    const appConfig = await prisma.appConfig.update({
      where: { id: "app-config" },
      data: updates,
    });

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error("Error updating password policy:", error);
    return NextResponse.json({ error: "Error updating password policy" }, { status: 500 });
  }
}
