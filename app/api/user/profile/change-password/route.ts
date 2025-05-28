import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for password change request
const PasswordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

export async function POST(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const validationResult = PasswordChangeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If user has a password, verify the current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ message: "Current password is required" }, { status: 400 });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isCurrentPasswordValid) {
        return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
      }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { message: "An error occurred while changing password" },
      { status: 500 },
    );
  }
}
