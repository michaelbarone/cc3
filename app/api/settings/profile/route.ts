import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/settings/profile - Get user profile settings
export async function GET() {
  try {
    // Verify the user is authenticated
    const tokenData = await verifyToken();
    if (!tokenData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's profile data
    const user = await prisma.user.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Error getting user profile:", error);
    return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
  }
}

// PATCH /api/settings/profile - Update user profile settings
export async function PATCH(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const tokenData = await verifyToken();
    if (!tokenData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { username } = body;

    // Validate username
    if (typeof username !== "string" || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 },
      );
    }

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: tokenData.id }, // Exclude current user
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // Update the user's profile
    const updatedUser = await prisma.user.update({
      where: { id: tokenData.id },
      data: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      profile: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}
