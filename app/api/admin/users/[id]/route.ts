import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for user update
const UpdateUserSchema = z.object({
  role: z
    .enum(["USER", "ADMIN"], {
      invalid_type_error: "Role must be either USER or ADMIN",
    })
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/users/[id]
 *
 * Update a user's role or active status
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;

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

    // Get the user to update
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const validationResult = UpdateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const { role, isActive } = validationResult.data;

    // Prevent admin from changing their own role if they're the last admin
    if (userId === session.user.id && role === "USER" && targetUser.role === "ADMIN") {
      // Count active admins
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Cannot change role: You are the last active admin" },
          { status: 400 },
        );
      }
    }

    // Prevent admin from disabling their own account if they're the last admin
    if (userId === session.user.id && isActive === false && targetUser.role === "ADMIN") {
      // Count active admins
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Cannot disable account: You are the last active admin" },
          { status: 400 },
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "User updated successfully", user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ message: "An error occurred while updating user" }, { status: 500 });
  }
}
