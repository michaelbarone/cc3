import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// Using the exact Next.js 15 route handler pattern
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user: any = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "User is inactive" }, { status: 403 });
    }

    // Return a safe user object without sensitive information
    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
