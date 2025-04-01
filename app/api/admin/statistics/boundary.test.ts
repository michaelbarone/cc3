import { GET as getStatistics } from "@/app/api/admin/statistics/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { setupTestMocks } from "@/app/lib/test/mocks";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/auth/jwt");

describe("Admin Statistics API Boundary Tests", () => {
  const { cookieStore, prisma: mockPrisma } = setupTestMocks();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to admin user
    vi.mocked(verifyToken).mockResolvedValue({
      id: "admin-id",
      username: "admin",
      isAdmin: true,
    });
  });

  describe("Edge Cases - Empty Data", () => {
    it("should handle no users in the system", async () => {
      // Mock empty user data
      mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: 0 } });
      mockPrisma.user.groupBy.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.users.total).toBe(0);
      expect(data.system.users.active).toBe(0);
      expect(data.system.users.adminRatio.admin).toBe(0);
      expect(data.system.users.adminRatio.regular).toBe(0);
      expect(data.userPreferences.themeDistribution).toEqual({});
      expect(data.userPreferences.menuPositionDistribution).toEqual({});
      expect(data.activity.recentlyActive).toEqual([]);
    });

    it("should handle no URL groups in the system", async () => {
      // Mock empty URL group data
      mockPrisma.urlGroup.aggregate.mockResolvedValue({ _count: { _all: 0 } });
      mockPrisma.urlGroup.findMany.mockResolvedValue([]);
      mockPrisma.urlGroup.count.mockResolvedValue(0);

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.urlGroups.total).toBe(0);
      expect(data.system.urlGroups.unused).toBe(0);
      expect(data.system.urlGroups.averageUrlsPerGroup).toBe(0);
      expect(data.urlGroups.mostAssigned).toEqual([]);
    });
  });

  describe("Edge Cases - Maximum Values", () => {
    it("should handle large numbers of users", async () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: largeNumber } });
      mockPrisma.user.groupBy.mockImplementation((args: { by: string[] }) => {
        if (args.by[0] === "themeMode") {
          return Promise.resolve([
            { themeMode: "light", _count: { _all: largeNumber / 2 } },
            { themeMode: "dark", _count: { _all: largeNumber / 2 } },
          ]);
        }
        return Promise.resolve([]);
      });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.users.total).toBe(largeNumber);
      expect(typeof data.system.users.total).toBe("number");
      expect(Number.isSafeInteger(data.system.users.total)).toBe(true);
    });

    it("should handle maximum URL counts", async () => {
      mockPrisma.$queryRaw.mockImplementation((query: any) => {
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

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.system.urls.withMobileVersion).toBe("number");
      expect(typeof data.system.urls.desktopOnly).toBe("number");
      expect(Number.isSafeInteger(data.system.urls.withMobileVersion)).toBe(true);
      expect(Number.isSafeInteger(data.system.urls.desktopOnly)).toBe(true);
    });
  });

  describe("Edge Cases - Invalid Data", () => {
    it("should handle invalid date formats in user activity", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          username: "user1",
          lastActiveUrl: "https://example.com",
          updatedAt: "invalid-date",
        },
      ]);

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activity.recentlyActive[0]).toHaveProperty("updatedAt");
      expect(() => new Date(data.activity.recentlyActive[0].updatedAt)).not.toThrow();
    });

    it("should handle null values in user preferences", async () => {
      mockPrisma.user.groupBy.mockImplementation((args: { by: string[] }) => {
        if (args.by[0] === "themeMode") {
          return Promise.resolve([{ themeMode: null, _count: { _all: 10 } }]);
        }
        if (args.by[0] === "menuPosition") {
          return Promise.resolve([{ menuPosition: null, _count: { _all: 10 } }]);
        }
        return Promise.resolve([]);
      });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userPreferences.themeDistribution).toBeDefined();
      expect(data.userPreferences.menuPositionDistribution).toBeDefined();
    });
  });

  describe("Edge Cases - Concurrent Updates", () => {
    it("should handle data changes between multiple queries", async () => {
      let userCount = 10;
      mockPrisma.user.aggregate.mockImplementation(() => {
        userCount += 1;
        return Promise.resolve({ _count: { _all: userCount } });
      });

      mockPrisma.user.count.mockImplementation(() => {
        userCount += 1;
        return Promise.resolve(userCount);
      });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.users.total).toBeGreaterThan(0);
      expect(typeof data.system.users.total).toBe("number");
    });
  });

  describe("Edge Cases - Performance", () => {
    it("should handle large result sets efficiently", async () => {
      // Create a large array of mock users with proper timestamps
      const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        username: `user${i}`,
        lastActiveUrl: `https://example.com/${i}`,
        updatedAt: new Date(Date.now() - i * 60000).toISOString(), // Decreasing timestamps
        isAdmin: false,
        themeMode: "light",
        menuPosition: "left",
      }));

      // Mock all required user data
      mockPrisma.user.findMany.mockResolvedValue(largeUserList);
      mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: largeUserList.length } });
      mockPrisma.user.groupBy.mockResolvedValue([
        { themeMode: "light", _count: { _all: largeUserList.length } },
      ]);
      mockPrisma.user.count.mockResolvedValue(largeUserList.length);

      const startTime = performance.now();
      const response = await getStatistics();
      const endTime = performance.now();

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in less than 1 second
      expect(data.activity.recentlyActive).toHaveLength(10); // Should limit to 10 results
      // Verify we got the most recent users
      expect(data.activity.recentlyActive[0].username).toBe("user0");
    });
  });
});
