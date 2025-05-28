import { prisma } from "@/lib/db/prisma";
import { createUser, getAllUsers } from "@/lib/services/userService";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for user creation
const CreateUserSchema = z.object({
  name: z.string().min(3, "Username must be at least 3 characters"),
  role: z.enum(["USER", "ADMIN"], {
    invalid_type_error: "Role must be either USER or ADMIN",
  }),
});

/**
 * GET /api/admin/users
 *
 * List all users for the admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Check if the user is an admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Get all users
    const users = await getAllUsers();

    // Format users for response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ users: formattedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching users" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/users
 *
 * Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Check if the user is an admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Check if user creation is allowed
    const userCreationSetting = await prisma.systemSetting.findUnique({
      where: { key: "allowAdminUserCreation" },
    });

    if (userCreationSetting && userCreationSetting.value === "false") {
      return NextResponse.json({ message: "User creation is currently disabled" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const validationResult = CreateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const { name, role } = validationResult.data;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { name },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Username already exists" }, { status: 400 });
    }

    // Create new user with our service that handles UserSetting creation
    const newUser = await createUser({ name, role });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ message: "An error occurred while creating user" }, { status: 500 });
  }
}
