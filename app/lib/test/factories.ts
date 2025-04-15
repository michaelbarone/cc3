/**
 * Test data factories
 */

interface MockUser {
  id: string;
  username: string;
  isAdmin: boolean;
  email?: string;
  themeMode?: 'light' | 'dark';
  menuPosition?: 'left' | 'right';
  lastActiveUrl?: string;
  updatedAt?: string;
}

/**
 * Create a mock user with default values
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
