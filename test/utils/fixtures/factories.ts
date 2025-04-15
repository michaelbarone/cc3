/**
 * Test data factories for generating mock data
 * @module test/fixtures/factories
 */

/**
 * Represents a mock user for testing purposes
 */
interface MockUser {
  /** Unique identifier for the user */
  id: string;
  /** Username for display and login */
  username: string;
  /** Whether the user has admin privileges */
  isAdmin: boolean;
  /** User's email address */
  email?: string;
  /** User's preferred theme setting */
  themeMode?: 'light' | 'dark';
  /** User's preferred menu position */
  menuPosition?: 'left' | 'right';
  /** Last URL the user visited */
  lastActiveUrl?: string;
  /** Timestamp of last update */
  updatedAt?: string;
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
  const defaultUser: MockUser = {
    id: `user-${Math.random().toString(36).slice(2, 9)}`,
    username: `user-${Math.random().toString(36).slice(2, 9)}`,
    isAdmin: false,
    email: `test-${Math.random().toString(36).slice(2, 9)}@example.com`,
    themeMode: 'light',
    menuPosition: 'left',
    lastActiveUrl: 'https://example.com',
    updatedAt: new Date().toISOString(),
  };

  return {
    ...defaultUser,
    ...overrides,
  };
}
