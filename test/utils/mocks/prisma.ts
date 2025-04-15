import { Mock, vi } from "vitest";

type MockFn = Mock & {
  mockResolvedValue: (value: any) => Mock;
  mockImplementation: (fn: (...args: any[]) => any) => Mock;
};

interface PrismaMock {
  findUnique: MockFn;
  findMany: MockFn;
  create: MockFn;
  update: MockFn;
  delete: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
  count: MockFn;
}

interface PrismaCustomImplementations {
  user?: Partial<PrismaMock>;
  urlGroup?: Partial<PrismaMock>;
  url?: Partial<PrismaMock>;
  appConfig?: Partial<PrismaMock>;
  $transaction?: MockFn;
  $disconnect?: MockFn;
  $queryRaw?: MockFn;
}

/**
 * Create mock user data
 */
export const createMockUser = (overrides = {}) => ({
  id: "test-user",
  username: "testuser",
  isAdmin: true,
  avatarUrl: "/avatars/old-avatar.webp",
  passwordHash: "hash",
  lastActiveUrl: "/",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
  menuPosition: "left",
  themeMode: "light",
  ...overrides
})

/**
 * Create mock app config
 */
export const createMockAppConfig = (overrides = {}) => ({
  id: "test-config",
  logoUrl: "/logos/old-logo.webp",
  iconUrl: "/icons/old-icon.webp",
  ...overrides
})

/**
 * Create a mock Prisma client with common operations
 * @param customImplementations Optional custom implementations for Prisma methods
 */
export const createMockPrismaClient = (customImplementations: PrismaCustomImplementations = {}) => {
  const defaultMock = {
    findUnique: vi.fn() as MockFn,
    findMany: vi.fn() as MockFn,
    create: vi.fn() as MockFn,
    update: vi.fn() as MockFn,
    delete: vi.fn() as MockFn,
    aggregate: vi.fn() as MockFn,
    groupBy: vi.fn() as MockFn,
    count: vi.fn() as MockFn,
  };

  return {
    user: { ...defaultMock, ...customImplementations.user },
    urlGroup: { ...defaultMock, ...customImplementations.urlGroup },
    url: { ...defaultMock, ...customImplementations.url },
    appConfig: {
      findUnique: vi.fn() as MockFn,
      upsert: vi.fn() as MockFn,
      update: vi.fn() as MockFn,
      ...customImplementations.appConfig,
    },
    $transaction: vi.fn() as MockFn,
    $disconnect: vi.fn() as MockFn,
    $queryRaw: vi.fn() as MockFn,
    ...customImplementations,
  };
};

// Mock the entire prisma client
export const mockPrismaClient = createMockPrismaClient()

// Mock the prisma import
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: mockPrismaClient
}))
