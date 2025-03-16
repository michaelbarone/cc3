import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth/jwt';
import { prisma } from '@/app/lib/db/prisma';

export async function GET() {
  try {
    const user = await verifyToken();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get fresh user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        isAdmin: true,
        lastActiveUrl: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Me route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
