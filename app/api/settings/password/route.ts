import { verifyToken } from "@/app/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/app/lib/auth/password";
import { db } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const tokenData = await verifyToken();

    if (!tokenData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the request body
    const { currentPassword, newPassword } = await request.json();

    // Get the user from the database
    const user = await db.user.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        username: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user has a password
    const hasPassword = !!user.passwordHash;

    // If user has a password, validate the current password
    if (hasPassword && currentPassword) {
      const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!passwordValid) {
        return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
      }
    }

    // Update the user's password
    if (newPassword === null) {
      // Remove password
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: null },
      });

      return NextResponse.json({
        message: "Password protection disabled successfully",
        hasPassword: false,
      });
    } else {
      // Update with new password
      const passwordHash = await hashPassword(newPassword);

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return NextResponse.json({
        message: "Password updated successfully",
        hasPassword: true,
      });
    }
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
