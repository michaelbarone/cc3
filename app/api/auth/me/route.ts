import { removeAuthCookie, verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get fresh user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        isAdmin: true,
        lastActiveUrl: true,
        passwordHash: true,
        avatarUrl: true,
        menuPosition: true,
        themeMode: true,
      },
    });

    if (!userData) {
      // If user from token not found in database, clear the cookie
      await removeAuthCookie();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add hasPassword property based on whether passwordHash exists
    const userWithHasPassword = {
      ...userData,
      hasPassword: !!userData.passwordHash,
      passwordHash: undefined, // Remove passwordHash from the response
    };

    return NextResponse.json({ user: userWithHasPassword });
  } catch (error) {
    console.error("Me route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
