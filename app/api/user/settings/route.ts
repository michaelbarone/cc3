import { MenuPosition, Theme } from "@/app/types/user-settings";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettingsService";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET handler for retrieving user settings
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserSettings(session.user.id);

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json({ error: "Failed to fetch user settings" }, { status: 500 });
  }
}

/**
 * Schema for validating user settings updates
 */
const updateSettingsSchema = z.object({
  theme: z.enum([Theme.LIGHT, Theme.DARK, Theme.SYSTEM]).optional(),
  menuPosition: z.enum([MenuPosition.TOP, MenuPosition.SIDE]).optional(),
});

/**
 * PUT handler for updating user settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const result = updateSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 },
      );
    }

    // Ensure at least one field is being updated
    if (Object.keys(result.data).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    const updatedSettings = await updateUserSettings(session.user.id, result.data);

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
