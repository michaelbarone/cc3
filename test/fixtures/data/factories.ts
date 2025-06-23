/**
 * Test data factories for generating mock data
 * @module test/fixtures/factories
 */

import { v4 as uuid } from 'uuid';

/**
 * Represents a mock user for testing purposes
 */
export interface MockUser {
  /** Unique identifier for the user */
  id: string;
  /** Username for display and login */
  username: string;
  /** Whether the user has admin privileges */
  isAdmin: boolean;
  /** User's email address */
  email?: string;
  /** User's avatar URL */
  avatarUrl?: string | null;
  /** Whether user requires password */
  requiresPassword?: boolean;
  /** User's password (for testing only) */
  password?: string;
  /** User's hashed password */
  password_hash?: string | null;
  /** User's preferred theme setting */
  themeMode?: 'light' | 'dark';
  /** User's preferred menu position */
  menuPosition?: 'top' | 'side';
  /** Last URL the user visited */
  lastActiveUrl?: string;
  last_active_url?: string | null;
  /** Timestamp of last update */
  updatedAt?: Date;
  /** Timestamp of creation */
  createdAt?: Date;
  /** Timestamp of last login */
  lastLoginAt?: string | null;
}

/**
 * Creates a mock user with default values
 * @param overrides - Optional partial user object to override default values
 * @returns {MockUser} A complete mock user object
 *
 * @example
 * ```ts
 * // Create a default user
 * const user = createMockUser();
 *
 * // Create an admin user
 * const admin = createMockUser({ isAdmin: true });
 * ```
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date();
  const defaultUser: MockUser = {
    id: `user-${uuid()}`,
    username: `user-${uuid()}`,
    isAdmin: false,
    email: `test-${uuid()}@example.com`,
    avatarUrl: null,
    requiresPassword: false,
    password_hash: null,
    themeMode: 'light',
    menuPosition: 'top',
    lastActiveUrl: 'https://example.com',
    last_active_url: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  return {
    ...defaultUser,
    ...overrides,
  };
}

/**
 * Creates a mock admin user
 * @param overrides - Optional partial user object to override default values
 * @returns {MockUser} A complete mock admin user object
 */
export function createTestAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    id: `admin-${uuid()}`,
    username: "admin",
    isAdmin: true,
    requiresPassword: true,
    password: 'admin123',
    password_hash: 'hashed_admin123',
    ...overrides
  });
}

/**
 * Creates a mock app configuration
 */
export function createTestAppConfig(overrides = {}) {
  const now = new Date();
  return {
    id: "app-config",
    appName: "Control Center",
    appLogo: null,
    loginTheme: "dark",
    registrationEnabled: false,
    favicon: null,
    minPasswordLength: 4,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Creates a mock URL group
 */
export function createTestUrlGroup(overrides = {}) {
  const now = new Date();
  return {
    id: `group-${uuid()}`,
    name: "Test Group",
    description: "Test group description",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Creates a mock URL
 */
export function createTestUrl(overrides = {}) {
  const now = new Date();
  return {
    id: `url-${uuid()}`,
    title: "Test URL",
    url: "https://example.com",
    urlMobile: "https://m.example.com",
    iconPath: "/icons/test.png",
    idleTimeoutMinutes: 10,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Pre-defined mock users for testing
 */
export const mockUsers: MockUser[] = [
  createTestAdmin({
    id: '1',
    username: 'admin'
  }),
  createMockUser({
    id: '2',
    username: 'user'
  })
];
