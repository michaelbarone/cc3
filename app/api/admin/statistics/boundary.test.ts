import { GET } from "@/app/api/admin/statistics/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { setupTestMocks } from "@/test/mocks/services";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Import the StatisticsResponse type
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
    themeDistribution: {
      light: number;
      dark: number;
    };
    menuPositionDistribution: {
      left: number;
      right: number;
    };
  };
  activity: {
    recentlyActive: Array<{
      username: string;
      lastActiveUrl: string | null;
      updatedAt: string;
    }>;
    mostAccessedUrls: Array<{
      id: string;
      title: string;
      url: string;
      accessCount: number;
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

vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Mock cookie store
const mockCookieStore = {
  get: vi.fn((name: string) => {
    if (name === "auth_token") {
      return { value: "mock_token" };
    }
    return undefined;
  }),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<T[K]> extends Promise<any>
      ? {
          mockResolvedValue: (val: any) => void;
          mockImplementation: (fn: (...args: any[]) => any) => void;
        }
      : {
          mockReturnValue: (val: any) => void;
          mockImplementation: (fn: (...args: any[]) => any) => void;
        }
    : T[K] extends object
      ? DeepMockProxy<T[K]>
      : T[K];
};

describe("Admin Statistics API Boundary Tests", () => {
  const suiteTimer = measureTestTime("Admin Statistics Boundary Suite");
  const { prisma: mockPrisma } = setupTestMocks();
  const typedMockPrisma = mockPrisma as unknown as DeepMockProxy<PrismaClient>;
  const mockRequest = new NextRequest("http://localhost:3000/api/admin/statistics");

  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockNonAdminUser = {
    id: "user-id",
    username: "user",
    isAdmin: false,
  };

  beforeEach(() => {
    const setupTimer = measureTestTime("test-setup");
    try {
      vi.clearAllMocks();
      // Default to admin authentication
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "auth_token") {
          return { value: "admin_token" };
        }
        return undefined;
      });
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      // Default database responses
      (typedMockPrisma.user.aggregate as any).mockResolvedValue({ _count: { _all: 0 } });
      (typedMockPrisma.user.groupBy as any).mockResolvedValue([]);
      (typedMockPrisma.user.count as any).mockResolvedValue(0);
      (typedMockPrisma.user.findMany as any).mockResolvedValue([]);
      (typedMockPrisma.urlGroup.aggregate as any).mockResolvedValue({ _count: { _all: 0 } });
      (typedMockPrisma.urlGroup.findMany as any).mockResolvedValue([]);
      (typedMockPrisma.urlGroup.count as any).mockResolvedValue(0);
    } finally {
      setupTimer.end();
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      const testTimer = measureTestTime("unauthenticated-test");
      try {
        mockCookieStore.get.mockImplementation((name: string) => {
          if (name === "auth_token") {
            return undefined;
          }
          return undefined;
        });
        (verifyToken as any).mockResolvedValue(null);

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("non-admin-test");
      try {
        mockCookieStore.get.mockImplementation((name: string) => {
          if (name === "auth_token") {
            return { value: "user_token" };
          }
          return undefined;
        });
        (verifyToken as any).mockResolvedValue(mockNonAdminUser);

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 200 when authenticated as admin", async () => {
      const testTimer = measureTestTime("admin-test");
      try {
        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(data).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Edge Cases - Empty Data", () => {
    it("should handle no URL groups in the system", async () => {
      const testTimer = measureTestTime("empty-url-groups-test");
      try {
        // Mock empty URL group data
        typedMockPrisma.urlGroup.aggregate.mockResolvedValue({ _count: { _all: 0 } });
        typedMockPrisma.urlGroup.findMany.mockResolvedValue([]);
        typedMockPrisma.urlGroup.count.mockResolvedValue(0);

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(data.system.urlGroups.total).toBeGreaterThanOrEqual(0);
        expect(data.system.urlGroups.unused).toBe(0);
        expect(data.system.urlGroups.averageUrlsPerGroup).toBeGreaterThanOrEqual(0);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Edge Cases - Maximum Values", () => {
    it("should handle large numbers of users", async () => {
      const testTimer = measureTestTime("max-users-test");
      try {
        const largeNumber = Number.MAX_SAFE_INTEGER;
        typedMockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: largeNumber } });
        typedMockPrisma.user.groupBy.mockImplementation((args: { by: string[] }) => {
          if (args.by[0] === "themeMode") {
            return Promise.resolve([
              { themeMode: "light", _count: { _all: largeNumber / 2 } },
              { themeMode: "dark", _count: { _all: largeNumber / 2 } },
            ]);
          }
          return Promise.resolve([]);
        });

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(data.system.users.total).toBeLessThanOrEqual(largeNumber);
        expect(typeof data.system.users.total).toBe("number");
        expect(Number.isSafeInteger(data.system.users.total)).toBe(true);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should handle maximum URL counts", async () => {
      const testTimer = measureTestTime("max-urls-test");
      try {
        typedMockPrisma.$queryRaw.mockImplementation((query: any) => {
          const queryStr = query?.values?.[0] ?? "";
          if (queryStr.includes('"urlMobile"')) {
            return Promise.resolve([
              {
                withMobile: BigInt(Number.MAX_SAFE_INTEGER),
                desktopOnly: BigInt(Number.MAX_SAFE_INTEGER),
              },
            ]);
          }
          return Promise.resolve([]);
        });

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(typeof data.system.urls.withMobileVersion).toBe("number");
        expect(typeof data.system.urls.desktopOnly).toBe("number");
        expect(Number.isSafeInteger(data.system.urls.withMobileVersion)).toBe(true);
        expect(Number.isSafeInteger(data.system.urls.desktopOnly)).toBe(true);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Edge Cases - Invalid Data", () => {
    it("should handle invalid date formats in user activity", async () => {
      const testTimer = measureTestTime("invalid-date-test");
      try {
        typedMockPrisma.user.findMany.mockResolvedValue([
          {
            username: "user1",
            lastActiveUrl: "https://example.com",
            updatedAt: "invalid-date",
          },
        ]);

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(() => new Date(data?.activity?.recentlyActive?.[0]?.updatedAt)).not.toThrow();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should handle null values in user preferences", async () => {
      const testTimer = measureTestTime("null-preferences-test");
      try {
        typedMockPrisma.user.groupBy.mockImplementation((args: { by: string[] }) => {
          if (args.by[0] === "themeMode") {
            return Promise.resolve([{ themeMode: null, _count: { _all: 10 } }]);
          }
          if (args.by[0] === "menuPosition") {
            return Promise.resolve([{ menuPosition: null, _count: { _all: 10 } }]);
          }
          return Promise.resolve([]);
        });

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(data.userPreferences.themeDistribution).toBeDefined();
        expect(data.userPreferences.menuPositionDistribution).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Edge Cases - Concurrent Updates", () => {
    it("should handle data changes between multiple queries", async () => {
      const testTimer = measureTestTime("concurrent-updates-test");
      try {
        let userCount = 10;
        typedMockPrisma.user.aggregate.mockImplementation(() => {
          userCount += 1;
          return Promise.resolve({ _count: { _all: userCount } });
        });

        typedMockPrisma.user.count.mockImplementation(() => {
          userCount += 1;
          return Promise.resolve(userCount);
        });

        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;

        expect(response.status).toBe(200);
        expect(data.system.users.total).toBeGreaterThan(0);
        expect(typeof data.system.users.total).toBe("number");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Edge Cases - Performance", () => {
    it("should handle response timing", async () => {
      const testTimer = measureTestTime("response-timing-test");
      try {
        const startTime = Date.now();
        const response = await GET(mockRequest);
        const data = (await debugResponse(response)) as StatisticsResponse;
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000); // Response should be under 1 second
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
