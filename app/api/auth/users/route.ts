import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db/prisma';

// Define a type for the user from prisma
type UserWithAuth = {
  id: string;
  username: string;
  avatarUrl: string | null;
  passwordHash: string | null;
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
      },
      orderBy: {
        username: 'asc',
      },
    });

    // Transform data to only expose necessary information
    const transformedUsers = users.map((user: UserWithAuth) => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      requiresPassword: !!user.passwordHash,
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error fetching users' },
      { status: 500 }
    );
  }
}
