import { expect, vi } from "vitest";

/**
 * Types for statistics response data
 */
interface StatisticsResponse {
  system: {
    users: {
      total: number;
      active: number;
      withPassword: number;
      withoutPassword: number;
      adminRatio: {
        admin: number;
        regular: number;
      };
    };
    urlGroups: {
      total: number;
      unused: number;
      averageUrlsPerGroup: number;
    };
    urls: {
      total: number;
      withMobileVersion: number;
      desktopOnly: number;
      orphaned: number;
    };
  };
  userPreferences: {
    themeDistribution: Record<string, number>;
    menuPositionDistribution: Record<string, number>;
  };
  activity: {
    recentlyActive: Array<{
      username: string;
      lastActiveUrl: string | null;
      updatedAt: string;
    }>;
    mostAccessedUrls: Array<{
      url: string;
      count: number;
    }>;
  };
  urlGroups: {
    mostAssigned: Array<{
      name: string;
      userCount: number;
      urlCount: number;
    }>;
  };
}

/**
 * Creates mock user data with specified distribution
 */
export function createMockUserData(options: {
  total?: number;
  activeRatio?: number;
  adminRatio?: number;
  passwordRatio?: number;
  themeDistribution?: Record<string, number>;
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
 */
export function createMockUrlGroupData(options: {
  total?: number;
  unusedRatio?: number;
  averageUrls?: number;
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
 */
export function createMockUrlData(options: {
  total?: number;
  mobileRatio?: number;
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
 */
export function createMockRawQueries(options: {
  totalUrls?: number;
  mobileRatio?: number;
  orphanedUrls?: number;
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
        withMobile: BigInt(Math.floor(totalUrls * mobileRatio)),
        desktopOnly: BigInt(totalUrls - Math.floor(totalUrls * mobileRatio)),
      }]);
    }
    if (queryStr.includes('"urlGroupId"')) {
      return Promise.resolve([{ count: BigInt(orphanedUrls) }]);
    }
    if (queryStr.includes('"lastActiveUrl"')) {
      return Promise.resolve(
        mostAccessedUrls.map(({ url, count }) => ({
          url,
          count: BigInt(count),
        }))
      );
    }
    return Promise.resolve([]);
  });
}

/**
 * Sets up all statistics mocks with consistent data
 */
export function setupStatisticsMocks(mockPrisma: any, options: {
  userData?: Parameters<typeof createMockUserData>[0];
  urlGroupData?: Parameters<typeof createMockUrlGroupData>[0];
  urlData?: Parameters<typeof createMockUrlData>[0];
  rawQueries?: Parameters<typeof createMockRawQueries>[0];
} = {}) {
  const userMocks = createMockUserData(options.userData);
  const urlGroupMocks = createMockUrlGroupData(options.urlGroupData);
  const urlMocks = createMockUrlData(options.urlData);
  const rawQueryMocks = createMockRawQueries(options.rawQueries);

  // Apply mocks to prisma client
  Object.assign(mockPrisma.user, userMocks);
  Object.assign(mockPrisma.urlGroup, urlGroupMocks);
  Object.assign(mockPrisma.url, urlMocks);
  mockPrisma.$queryRaw = rawQueryMocks;

  return {
    userMocks,
    urlGroupMocks,
    urlMocks,
    rawQueryMocks,
  };
}

/**
 * Verifies statistics response structure and data types
 */
export function verifyStatisticsResponse(data: StatisticsResponse) {
  // System checks
  expect(typeof data.system.users.total).toBe("number");
  expect(typeof data.system.users.active).toBe("number");
  expect(typeof data.system.users.withPassword).toBe("number");
  expect(typeof data.system.users.withoutPassword).toBe("number");
  expect(typeof data.system.users.adminRatio.admin).toBe("number");
  expect(typeof data.system.users.adminRatio.regular).toBe("number");

  expect(typeof data.system.urlGroups.total).toBe("number");
  expect(typeof data.system.urlGroups.unused).toBe("number");
  expect(typeof data.system.urlGroups.averageUrlsPerGroup).toBe("number");

  expect(typeof data.system.urls.total).toBe("number");
  expect(typeof data.system.urls.withMobileVersion).toBe("number");
  expect(typeof data.system.urls.desktopOnly).toBe("number");
  expect(typeof data.system.urls.orphaned).toBe("number");

  // User preferences checks
  expect(data.userPreferences.themeDistribution).toBeTypeOf("object");
  expect(data.userPreferences.menuPositionDistribution).toBeTypeOf("object");

  // Activity checks
  expect(Array.isArray(data.activity.recentlyActive)).toBe(true);
  data.activity.recentlyActive.forEach(user => {
    expect(typeof user.username).toBe("string");
    expect(typeof user.updatedAt).toBe("string");
    expect(new Date(user.updatedAt).getTime()).not.toBeNaN();
    if (user.lastActiveUrl !== null) {
      expect(typeof user.lastActiveUrl).toBe("string");
    }
  });

  expect(Array.isArray(data.activity.mostAccessedUrls)).toBe(true);
  data.activity.mostAccessedUrls.forEach(url => {
    expect(typeof url.url).toBe("string");
    expect(typeof url.count).toBe("number");
    expect(Number.isSafeInteger(url.count)).toBe(true);
  });

  // URL groups checks
  expect(Array.isArray(data.urlGroups.mostAssigned)).toBe(true);
  data.urlGroups.mostAssigned.forEach(group => {
    expect(typeof group.name).toBe("string");
    expect(typeof group.userCount).toBe("number");
    expect(typeof group.urlCount).toBe("number");
    expect(Number.isSafeInteger(group.userCount)).toBe(true);
    expect(Number.isSafeInteger(group.urlCount)).toBe(true);
  });
}

/**
 * Creates test scenarios for statistics edge cases
 */
export const statisticsTestScenarios = {
  emptySystem: {
    userData: { total: 0 },
    urlGroupData: { total: 0 },
    urlData: { total: 0 },
  },
  maxValues: {
    userData: { total: Number.MAX_SAFE_INTEGER },
    urlGroupData: { total: Number.MAX_SAFE_INTEGER },
    urlData: { total: Number.MAX_SAFE_INTEGER },
  },
  highLoad: {
    userData: { total: 10000 },
    urlGroupData: { total: 1000 },
    urlData: { total: 50000 },
  },
  unbalancedDistribution: {
    userData: {
      total: 1000,
      adminRatio: 0.9,
      activeRatio: 0.1,
      themeDistribution: { dark: 0.9, light: 0.1 },
    },
  },
  allOrphaned: {
    urlData: { total: 1000, orphanedRatio: 1 },
  },
  noMobileUrls: {
    urlData: { total: 1000, mobileRatio: 0 },
  },
  allMobileUrls: {
    urlData: { total: 1000, mobileRatio: 1 },
  },
};
