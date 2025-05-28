import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

// Interface for the UserTile response
interface UserTile {
  id: string;
  username: string;
  avatarUrl: string | null;
  requiresPassword: boolean;
  isAdmin: boolean;
  lastLoginAt?: string;
}

export async function GET() {
  try {
    // Fetch all users ordered by createdAt
    const users: any[] = await prisma.user.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // Transform User records to UserTile objects
    const userTiles: UserTile[] = users.map((user) => ({
      id: user.id,
      username: user.name, // Map from User.name
      avatarUrl: user.avatarUrl,
      requiresPassword: !!user.passwordHash, // true if passwordHash exists
      isAdmin: user.role === "ADMIN",
      // Convert Date to ISO string if lastLoginAt exists
      ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt.toISOString() }),
    }));

    return NextResponse.json(userTiles);
  } catch (error) {
    console.error("Error fetching user tiles:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching user tiles" },
      { status: 500 },
    );
  }
}
