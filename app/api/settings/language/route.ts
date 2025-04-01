import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"];

// GET /api/settings/language - Get user language settings
export async function GET() {
  try {
    // Verify the user is authenticated
    const tokenData = await verifyToken();
    if (!tokenData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's language setting
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId: tokenData.id,
          key: "languagePreference",
        },
      },
    });

    // Return the language preference, defaulting to "en" if not set
    return NextResponse.json({
      language: setting ? JSON.parse(setting.value) : "en",
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  } catch (error) {
    console.error("Error getting language setting:", error);
    return NextResponse.json({ error: "Failed to get language setting" }, { status: 500 });
  }
}

// PATCH /api/settings/language - Update user language settings
export async function PATCH(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const tokenData = await verifyToken();
    if (!tokenData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { language } = body;

    // Validate language
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        {
          error: "Unsupported language",
          supportedLanguages: SUPPORTED_LANGUAGES,
        },
        { status: 400 },
      );
    }

    // Update the user's language preference
    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId: tokenData.id,
          key: "languagePreference",
        },
      },
      update: {
        value: JSON.stringify(language),
        updatedAt: new Date(),
      },
      create: {
        userId: tokenData.id,
        key: "languagePreference",
        value: JSON.stringify(language),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      language,
      message: "Language preference updated successfully",
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  } catch (error) {
    console.error("Error updating language setting:", error);
    return NextResponse.json({ error: "Failed to update language setting" }, { status: 500 });
  }
}
