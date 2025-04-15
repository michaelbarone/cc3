import { v4 as uuid } from 'uuid';

export const createTestAdmin = (overrides = {}) => ({
  id: `test-admin-${uuid()}`,
  username: "admin",
  isAdmin: true,
  ...overrides
});

export const createTestUser = (overrides = {}) => ({
  id: `test-user-${uuid()}`,
  username: "user",
  isAdmin: false,
  ...overrides
});

export const createTestAppConfig = (overrides = {}) => ({
  id: "app-config",
  appName: "Control Center",
  appLogo: null,
  loginTheme: "dark",
  registrationEnabled: false,
  favicon: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createTestUrlGroup = (overrides = {}) => ({
  id: `test-group-${uuid()}`,
  name: "Test Group",
  description: "Test group description",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createTestUrl = (overrides = {}) => ({
  id: `test-url-${uuid()}`,
  title: "Test URL",
  url: "https://example.com",
  urlMobile: "https://m.example.com",
  iconPath: "/icons/test.png",
  idleTimeoutMinutes: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});
