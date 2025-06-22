import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

// Define a type for the user from prisma
type UserWithAuth = {
  id: string;
  username: string;
  avatarUrl: string | null;
  passwordHash: string | null;
  isAdmin: boolean;
  lastLoginAt?: Date | null;
};

// GET /api/auth/users - Get all users for login screen
export async function GET() {
  try {
    // Fetch all users with minimal data needed for login tiles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        passwordHash: true, // Needed to determine if password is required
        isAdmin: true, // Needed to detect admin users
        lastLoginAt: true, // Needed to detect first-run state
      },
      orderBy: {
        username: "asc",
      },
    });

    // Sort case-insensitively
    const sortedUsers = [...users].sort((a, b) =>
      a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
    );

    // Transform data to only expose necessary information
    const transformedUsers = sortedUsers.map((user: UserWithAuth) => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      requiresPassword: !!user.passwordHash,
      isAdmin: user.isAdmin,
      lastLoginAt: user.lastLoginAt?.toISOString(),
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error fetching users" }, { status: 500 });
  }
}
