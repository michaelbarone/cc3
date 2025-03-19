import { verifyToken } from "@/app/lib/auth/jwt";
import { hashPassword } from "@/app/lib/auth/password";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

type Props = {
  params: Promise<{ id: string }>;
};

interface UserUpdateData {
  username: string;
  isAdmin: boolean;
  passwordHash?: string | null;
}

// GET - Fetch a specific user
export async function GET(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update a user
export async function PUT(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    const { username, password, isAdmin } = await request.json();

    // Validate input
    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Check for existing user with same username (excluding current user)
    const duplicateUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: id },
      },
    });

    if (duplicateUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    // Prepare update data
    const updateData: UserUpdateData = {
      username,
      isAdmin: isAdmin === true,
    };

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Remove a user
export async function DELETE(request: NextRequest, props: Props): Promise<NextResponse> {
  try {
    // Verify admin access
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await verifyToken();

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
