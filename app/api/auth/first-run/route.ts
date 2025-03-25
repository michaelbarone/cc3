import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        isAdmin: true,
        lastLoginAt: true,
      },
    });

    // Check if we have exactly one admin user who has never logged in
    const adminUsers = users.filter((user) => user.isAdmin);
    const isFirstRun = users.length === 1 && adminUsers.length === 1 && !adminUsers[0].lastLoginAt;

    return NextResponse.json({ isFirstRun });
  } catch (error) {
    console.error("First run check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
