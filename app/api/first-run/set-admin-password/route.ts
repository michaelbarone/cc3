import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // First, verify that the user is authenticated as the admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we're in first run state (admin with no lastLoginAt)
    const adminUser = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        role: "ADMIN",
        lastLoginAt: null,
      },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Not in first run state or not admin" }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 },
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the admin user with the new password and lastLoginAt
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash,
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting admin password:", error);
    return NextResponse.json({ error: "Failed to set admin password" }, { status: 500 });
  }
}
