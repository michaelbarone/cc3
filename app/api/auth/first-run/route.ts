import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

// Define the User interface to match the database schema
interface User {
  id: string;
  name: string;
  role: string;
  lastLoginAt: Date | null;
  // other fields...
}

// This route is used to check if the application is in "first run" state
// First run is defined as having exactly one admin user with no lastLoginAt

export async function GET() {
  try {
    // Get all users with type assertion
    const users = (await prisma.user.findMany()) as unknown as User[];

    // Check if there's exactly one user, and it's an admin with no lastLoginAt
    const isFirstRun =
      users.length === 1 &&
      users[0].role === "ADMIN" &&
      users[0].name === "admin" &&
      users[0].lastLoginAt === null;

    return NextResponse.json({ isFirstRun });
  } catch (error) {
    console.error("Error checking first run state:", error);
    return NextResponse.json({ error: "Failed to check first run state" }, { status: 500 });
  }
}
