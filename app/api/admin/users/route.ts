import { verifyToken } from "@/app/lib/auth/jwt";
import { hashPassword } from "@/app/lib/auth/password";
import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

// GET - Fetch all users
export async function GET() {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users from database
    const users = await prisma.user.findMany({
      orderBy: { username: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST - Create a new user
export async function POST(request: Request) {
  try {
    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { username, password, isAdmin } = await request.json();

    // Validate input
    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Check for existing user with same username
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        isAdmin: isAdmin === true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
