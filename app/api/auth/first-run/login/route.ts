import { prisma } from "@/lib/db/prisma";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Enum definition copied directly into this file
enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export async function POST(request: NextRequest) {
  try {
    // Check if we're in first run state
    const users = await prisma.user.findMany();

    if (users.length !== 1) {
      return NextResponse.json(
        { error: "Not in first run state - incorrect number of users" },
        { status: 403 },
      );
    }

    // Get the admin user and use 'as any' to bypass type checking
    const adminUser = users[0] as any;

    // Check if the user is admin and has never logged in
    if (
      !adminUser.isAdmin ||
      adminUser.username !== "admin" || // Using username instead of name based on schema
      adminUser.lastLoginAt !== null
    ) {
      return NextResponse.json(
        { error: "Not in first run state - admin user in wrong state" },
        { status: 403 },
      );
    }

    // Create a token using NextAuth's encode function
    const token = await encode({
      token: {
        id: adminUser.id,
        name: adminUser.username, // Using username instead of name
        isAdmin: adminUser.isAdmin,
        role: adminUser.isAdmin ? "ADMIN" : "USER", // Adding role as NextAuth expects it
        isActive: true, // Assuming active
        theme: "SYSTEM", // Default values
        menuPosition: "SIDE",
      },
      secret: process.env.NEXTAUTH_SECRET || "",
      maxAge: 60 * 60, // 1 hour only for first run
    });

    // Set the token in a cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour only for first run
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error in first run login:", error);
    return NextResponse.json({ error: "Failed to process first run login" }, { status: 500 });
  }
}
