import { User } from "@prisma/client";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    isAdmin: boolean;
    lastActiveUrl: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    avatarUrl: string | null;
    menuPosition: string | null;
    themeMode: string | null;
  };
}

export interface ErrorResponse {
  error: string;
  remainingAttempts?: number;
  resetTime?: string;
}

/**
 * Creates a mock user for testing
 * @param overrides - Optional overrides for user properties
 * @returns A mock user object
 */
export function createMockUser(overrides?: Partial<User>): User {
  const now = new Date();
  return {
    id: "test-user-id",
    username: "testuser",
    isAdmin: false,
    passwordHash: "hashed_password",
    lastActiveUrl: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    avatarUrl: null,
    menuPosition: "top",
    themeMode: "dark",
    ...overrides
  };
}

/**
 * Creates a mock auth response for API testing
 * @param user - The user object to include in the response
 * @param token - The JWT token to include in the response
 * @returns A mock auth response object
 */
export function createMockAuthResponse(user: User, token: string): AuthResponse {
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      lastActiveUrl: user.lastActiveUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      avatarUrl: user.avatarUrl,
      menuPosition: user.menuPosition,
      themeMode: user.themeMode
    }
  };
}

/**
 * Creates a mock error response for API testing
 * @param error - The error message
 * @param remainingAttempts - Optional number of remaining attempts
 * @param resetTime - Optional reset time for rate limiting
 * @returns A mock error response object
 */
export function createMockErrorResponse(
  error: string,
  remainingAttempts?: number,
  resetTime?: Date
): ErrorResponse {
  return {
    error,
    ...(remainingAttempts !== undefined && { remainingAttempts }),
    ...(resetTime && { resetTime: resetTime.toISOString() })
  };
}
