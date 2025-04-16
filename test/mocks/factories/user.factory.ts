/**
 * User Factory for creating mock user data
 * @module test/mocks/factories/user.factory
 */

import { User } from '@prisma/client';

export interface MockUser extends Omit<User, 'lastLoginAt'> {
  lastLoginAt?: Date | null;
  password?: string;
  menuPosition: string | null;
  themeMode: string | null;
}

/**
 * Creates a mock user with default values and optional overrides
 * @param overrides - Optional partial user data to override defaults
 * @returns MockUser object with all required fields
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date();
  const userId = `user-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id: userId,
    username: 'testuser',
    passwordHash: null,
    isAdmin: false,
    lastActiveUrl: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    avatarUrl: null,
    menuPosition: 'top',
    themeMode: 'light',
    ...overrides
  };
}

/**
 * Creates a mock admin user
 * @param overrides - Optional partial user data to override defaults
 * @returns MockUser object with admin privileges
 */
export function createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    isAdmin: true,
    username: 'admin',
    menuPosition: 'side',
    themeMode: 'dark',
    ...overrides
  });
}
