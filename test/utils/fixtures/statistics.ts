/**
 * Test fixtures and utilities for statistics-related tests
 * @module test/fixtures/statistics
 */

import { expect, vi } from "vitest";

/**
 * Type definition for the statistics API response
 */
interface StatisticsResponse {
  /** System-wide statistics */
  system: {
    /** User-related statistics */
    users: {
      /** Total number of users in the system */
      total: number;
      /** Number of active users */
      active: number;
      /** Number of users with password authentication */
      withPassword: number;
      /** Number of users without password authentication */
      withoutPassword: number;
      /** Distribution of admin vs regular users */
      adminRatio: {
        /** Number of admin users */
        admin: number;
        /** Number of regular users */
        regular: number;
      };
    };
    /** URL group statistics */
    urlGroups: {
      /** Total number of URL groups */
      total: number;
      /** Number of unused URL groups */
      unused: number;
      /** Average number of URLs per group */
      averageUrlsPerGroup: number;
    };
    /** URL statistics */
    urls: {
      /** Total number of URLs */
      total: number;
      /** Number of URLs with mobile versions */
      withMobileVersion: number;
      /** Number of desktop-only URLs */
      desktopOnly: number;
      /** Number of orphaned URLs */
      orphaned: number;
    };
  };
  /** User preference statistics */
  userPreferences: {
    /** Distribution of theme preferences */
    themeDistribution: Record<string, number>;
    /** Distribution of menu position preferences */
    menuPositionDistribution: Record<string, number>;
  };
  /** Activity statistics */
  activity: {
    /** Recently active users */
    recentlyActive: Array<{
      /** Username of the active user */
      username: string;
      /** Last URL accessed by the user */
      lastActiveUrl: string | null;
      /** Timestamp of last activity */
      updatedAt: string;
    }>;
    /** Most frequently accessed URLs */
    mostAccessedUrls: Array<{
      /** URL path */
      url: string;
      /** Access count */
      count: number;
    }>;
  };
  /** URL group statistics */
  urlGroups: {
    /** Most assigned URL groups */
    mostAssigned: Array<{
      /** Group name */
      name: string;
      /** Number of users assigned to the group */
      userCount: number;
      /** Number of URLs in the group */
      urlCount: number;
    }>;
  };
}

/**
 * Creates mock user data with specified distribution
 * @param options Configuration options for mock user data
 * @returns Mock Prisma user model implementation
 *
 * @example
 * ```ts
 * const mockUsers = createMockUserData({
 *   total: 100,
 *   activeRatio: 0.8,
 *   adminRatio: 0.1
 * });
 * ```
 */
export function createMockUserData(options: {
  /** Total number of users (default: 100) */
  total?: number;
  /** Ratio of active users (default: 0.5) */
  activeRatio?: number;
  /** Ratio of admin users (default: 0.05) */
  adminRatio?: number;
  /** Ratio of users with passwords (default: 0.8) */
  passwordRatio?: number;
  /** Theme preference distribution (default: { light: 0.5, dark: 0.5 }) */
  themeDistribution?: Record<string, number>;
  /** Menu position distribution (default: { left: 0.6, right: 0.4 }) */
  menuDistribution?: Record<string, number>;
} = {}) {
  const {
    total = 100,
    activeRatio = 0.5,
    adminRatio = 0.05,
    passwordRatio = 0.8,
    themeDistribution = { light: 0.5, dark: 0.5 },
    menuDistribution = { left: 0.6, right: 0.4 },
  } = options;

  const activeUsers = Math.floor(total * activeRatio);
  const adminUsers = Math.floor(total * adminRatio);
  const usersWithPassword = Math.floor(total * passwordRatio);

  return {
    aggregate: vi.fn().mockResolvedValue({ _count: { _all: total } }),
    groupBy: vi.fn().mockImplementation((args: { by: string[] }) => {
      switch (args.by[0]) {
        case "themeMode":
          return Promise.resolve(
            Object.entries(themeDistribution).map(([theme, ratio]) => ({
              themeMode: theme,
              _count: { _all: Math.floor(total * ratio) },
            }))
          );
        case "menuPosition":
          return Promise.resolve(
            Object.entries(menuDistribution).map(([position, ratio]) => ({
              menuPosition: position,
              _count: { _all: Math.floor(total * ratio) },
            }))
          );
        case "isAdmin":
          return Promise.resolve([
            { isAdmin: true, _count: { _all: adminUsers } },
            { isAdmin: false, _count: { _all: total - adminUsers } },
          ]);
        case "passwordHash":
          return Promise.resolve([
            { passwordHash: "hash", _count: { _all: usersWithPassword } },
            { passwordHash: null, _count: { _all: total - usersWithPassword } },
          ]);
        default:
          return Promise.resolve([]);
      }
    }),
    count: vi.fn().mockResolvedValue(activeUsers),
    findMany: vi.fn().mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        username: `user${i + 1}`,
        lastActiveUrl: `https://example${i + 1}.com`,
        updatedAt: new Date(2024, 0, i + 1),
      }))
    ),
  };
}

/**
 * Creates mock URL group data
 * @param options Configuration options for mock URL group data
 * @returns Mock Prisma URL group model implementation
 *
 * @example
 * ```ts
 * const mockUrlGroups = createMockUrlGroupData({
 *   total: 20,
 *   unusedRatio: 0.1,
 *   averageUrls: 5
 * });
 * ```
 */
export function createMockUrlGroupData(options: {
  /** Total number of URL groups (default: 20) */
  total?: number;
  /** Ratio of unused groups (default: 0.25) */
  unusedRatio?: number;
  /** Average URLs per group (default: 4.5) */
  averageUrls?: number;
  /** Number of top groups to return (default: 5) */
  topGroups?: number;
} = {}) {
  const {
    total = 20,
    unusedRatio = 0.25,
    averageUrls = 4.5,
    topGroups = 5,
  } = options;

  const unusedGroups = Math.floor(total * unusedRatio);

  return {
    aggregate: vi.fn().mockResolvedValue({ _count: { _all: total } }),
    findMany: vi.fn().mockResolvedValue(
      Array.from({ length: topGroups }, (_, i) => ({
        name: `Group ${i + 1}`,
        _count: {
          userUrlGroups: 10 - i,
          urls: Math.floor(averageUrls),
        },
      }))
    ),
    count: vi.fn().mockResolvedValue(unusedGroups),
  };
}

/**
 * Creates mock URL data
 * @param options Configuration options for mock URL data
 * @returns Mock Prisma URL model implementation
 *
 * @example
 * ```ts
 * const mockUrls = createMockUrlData({
 *   total: 200,
 *   mobileRatio: 0.3,
 *   orphanedRatio: 0.05
 * });
 * ```
 */
export function createMockUrlData(options: {
  /** Total number of URLs (default: 200) */
  total?: number;
  /** Ratio of URLs with mobile versions (default: 0.25) */
  mobileRatio?: number;
  /** Ratio of orphaned URLs (default: 0.05) */
  orphanedRatio?: number;
} = {}) {
  const {
    total = 200,
    mobileRatio = 0.25,
    orphanedRatio = 0.05,
  } = options;

  const mobileUrls = Math.floor(total * mobileRatio);
  const orphanedUrls = Math.floor(total * orphanedRatio);

  return {
    aggregate: vi.fn().mockResolvedValue({ _count: { _all: total } }),
    count: vi.fn().mockResolvedValue(total),
  };
}

/**
 * Creates mock raw query responses
 * @param options Configuration options for mock raw queries
 * @returns Mock Prisma raw query implementation
 *
 * @example
 * ```ts
 * const mockQueries = createMockRawQueries({
 *   totalUrls: 200,
 *   mobileRatio: 0.3,
 *   mostAccessedUrls: [
 *     { url: "/dashboard", count: 100 },
 *     { url: "/profile", count: 50 }
 *   ]
 * });
 * ```
 */
export function createMockRawQueries(options: {
  /** Total number of URLs (default: 200) */
  totalUrls?: number;
  /** Ratio of URLs with mobile versions (default: 0.25) */
  mobileRatio?: number;
  /** Number of orphaned URLs (default: 10) */
  orphanedUrls?: number;
  /** Most accessed URLs data */
  mostAccessedUrls?: Array<{ url: string; count: number }>;
} = {}) {
  const {
    totalUrls = 200,
    mobileRatio = 0.25,
    orphanedUrls = 10,
    mostAccessedUrls = [
      { url: "https://example.com", count: 100 },
      { url: "https://example2.com", count: 50 },
      { url: "https://example3.com", count: 25 },
    ],
  } = options;

  return vi.fn().mockImplementation((query: any) => {
    const queryStr = query?.values?.[0] ?? "";
    if (queryStr.includes('"urlMobile"')) {
      return Promise.resolve([{
        count: Math.floor(totalUrls * mobileRatio),
      }]);
    }
    if (queryStr.includes('"urlDesktop"')) {
      return Promise.resolve([{
        count: totalUrls - Math.floor(totalUrls * mobileRatio),
      }]);
    }
    if (queryStr.includes("orphaned")) {
      return Promise.resolve([{
        count: orphanedUrls,
      }]);
    }
    if (queryStr.includes("most_accessed")) {
      return Promise.resolve(mostAccessedUrls);
    }
    return Promise.resolve([]);
  });
}

/**
 * Sets up all statistics-related mocks
 * @param mockPrisma Mock Prisma client to configure
 * @param options Configuration options for all mock data
 * @returns The configured mock Prisma client
 *
 * @example
 * ```ts
 * const mockPrisma = createMockPrismaClient();
 * setupStatisticsMocks(mockPrisma, {
 *   userData: { total: 100 },
 *   urlGroupData: { total: 20 },
 *   urlData: { total: 200 }
 * });
 * ```
 */
export function setupStatisticsMocks(mockPrisma: any, options: {
  /** User data configuration */
  userData?: Parameters<typeof createMockUserData>[0];
  /** URL group data configuration */
  urlGroupData?: Parameters<typeof createMockUrlGroupData>[0];
  /** URL data configuration */
  urlData?: Parameters<typeof createMockUrlData>[0];
  /** Raw queries configuration */
  rawQueries?: Parameters<typeof createMockRawQueries>[0];
} = {}) {
  const {
    userData = {},
    urlGroupData = {},
    urlData = {},
    rawQueries = {},
  } = options;

  const mockUsers = createMockUserData(userData);
  const mockUrlGroups = createMockUrlGroupData(urlGroupData);
  const mockUrls = createMockUrlData(urlData);
  const mockQueries = createMockRawQueries(rawQueries);

  mockPrisma.user = mockUsers;
  mockPrisma.urlGroup = mockUrlGroups;
  mockPrisma.url = mockUrls;
  mockPrisma.$queryRaw = mockQueries;

  return mockPrisma;
}

/**
 * Verifies that a statistics response matches the expected structure
 * @param data The response data to verify
 * @throws If the response structure is invalid
 *
 * @example
 * ```ts
 * const response = await getStatistics();
 * const data = await response.json();
 * verifyStatisticsResponse(data);
 * ```
 */
export function verifyStatisticsResponse(data: StatisticsResponse) {
  expect(data).toHaveProperty("system");
  expect(data.system).toHaveProperty("users");
  expect(data.system).toHaveProperty("urlGroups");
  expect(data.system).toHaveProperty("urls");
  expect(data).toHaveProperty("userPreferences");
  expect(data).toHaveProperty("activity");
  expect(data).toHaveProperty("urlGroups");

  // Verify user statistics
  expect(data.system.users).toHaveProperty("total");
  expect(data.system.users).toHaveProperty("active");
  expect(data.system.users).toHaveProperty("withPassword");
  expect(data.system.users).toHaveProperty("withoutPassword");
  expect(data.system.users).toHaveProperty("adminRatio");

  // Verify URL group statistics
  expect(data.system.urlGroups).toHaveProperty("total");
  expect(data.system.urlGroups).toHaveProperty("unused");
  expect(data.system.urlGroups).toHaveProperty("averageUrlsPerGroup");

  // Verify URL statistics
  expect(data.system.urls).toHaveProperty("total");
  expect(data.system.urls).toHaveProperty("withMobileVersion");
  expect(data.system.urls).toHaveProperty("desktopOnly");
  expect(data.system.urls).toHaveProperty("orphaned");

  // Verify user preferences
  expect(data.userPreferences).toHaveProperty("themeDistribution");
  expect(data.userPreferences).toHaveProperty("menuPositionDistribution");

  // Verify activity data
  expect(data.activity).toHaveProperty("recentlyActive");
  expect(Array.isArray(data.activity.recentlyActive)).toBe(true);
  expect(data.activity).toHaveProperty("mostAccessedUrls");
  expect(Array.isArray(data.activity.mostAccessedUrls)).toBe(true);

  // Verify URL group data
  expect(data.urlGroups).toHaveProperty("mostAssigned");
  expect(Array.isArray(data.urlGroups.mostAssigned)).toBe(true);
}
