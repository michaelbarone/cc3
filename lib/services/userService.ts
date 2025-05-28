import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { createDefaultUserSettings } from "./userSettingsService";

interface CreateUserData {
  name: string;
  role: string;
  password?: string;
}

/**
 * Create a new user with default settings
 */
export async function createUser(data: CreateUserData) {
  // Use transaction to ensure both user and settings are created
  return await prisma.$transaction(async (tx) => {
    // Create user
    const userData: any = {
      name: data.name,
      role: data.role,
      isActive: true,
    };

    // If password is provided, hash it
    if (data.password) {
      userData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await tx.user.create({
      data: userData,
    });

    // Create default user settings
    await createDefaultUserSettings(user.id);

    return user;
  });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      settings: true,
    },
  });
}

/**
 * Get all users
 */
export async function getAllUsers() {
  return await prisma.user.findMany({
    include: {
      settings: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

/**
 * Update user
 */
export async function updateUser(id: string, data: Partial<CreateUserData>) {
  const userData: any = {};

  if (data.name !== undefined) {
    userData.name = data.name;
  }

  if (data.role !== undefined) {
    userData.role = data.role;
  }

  if (data.password) {
    userData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  return await prisma.user.update({
    where: { id },
    data: userData,
  });
}

/**
 * Toggle user active status
 */
export async function toggleUserActiveStatus(id: string, isActive: boolean) {
  return await prisma.user.update({
    where: { id },
    data: { isActive },
  });
}
