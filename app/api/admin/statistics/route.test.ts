import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth token verification
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Mock Prisma client
vi.mock("@/app/lib/db/prisma", () => {
  const mockPrisma = {
    user: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    urlGroup: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    url: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };
  return { prisma: mockPrisma };
});

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn().mockReturnValue({ value: "mock_token" }),
  })),
}));

import { GET as getStatistics } from "@/app/api/admin/statistics/route";
import { GET as getBasicStats } from "@/app/api/admin/stats/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";

describe("Statistics API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to admin user
    (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isAdmin: true });
    // Default to having a token
    (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "mock_token" }),
    });
  });

  describe("GET /api/admin/statistics", () => {
    it("should return comprehensive statistics when authenticated as admin", async () => {
      // Mock all required Prisma calls
      (prisma.user.aggregate as any).mockResolvedValue({ _count: { _all: 100 } });
      (prisma.user.groupBy as any).mockImplementation((args: { by: string[] }) => {
        if (args.by[0] === "themeMode") {
          return Promise.resolve([
            { themeMode: "light", _count: { _all: 50 } },
            { themeMode: "dark", _count: { _all: 50 } },
          ]);
        }
        if (args.by[0] === "menuPosition") {
          return Promise.resolve([
            { menuPosition: "left", _count: { _all: 60 } },
            { menuPosition: "right", _count: { _all: 40 } },
          ]);
        }
        if (args.by[0] === "isAdmin") {
          return Promise.resolve([
            { isAdmin: true, _count: { _all: 5 } },
            { isAdmin: false, _count: { _all: 95 } },
          ]);
        }
        if (args.by[0] === "passwordHash") {
          return Promise.resolve([
            { passwordHash: "hash", _count: { _all: 80 } },
            { passwordHash: null, _count: { _all: 20 } },
          ]);
        }
        return Promise.resolve([]);
      });

      (prisma.user.count as any).mockResolvedValue(50);
      (prisma.user.findMany as any).mockResolvedValue([
        {
          username: "user1",
          lastActiveUrl: "https://example.com",
          updatedAt: new Date("2024-01-01"),
        },
        {
          username: "user2",
          lastActiveUrl: "https://example2.com",
          updatedAt: new Date("2024-01-02"),
        },
      ]);

      (prisma.urlGroup.aggregate as any).mockResolvedValue({ _count: { _all: 20 } });
      (prisma.urlGroup.findMany as any).mockResolvedValue([
        {
          name: "Group 1",
          _count: { userUrlGroups: 10, urls: 5 },
        },
        {
          name: "Group 2",
          _count: { userUrlGroups: 8, urls: 4 },
        },
      ]);
      (prisma.urlGroup.count as any).mockResolvedValue(5);

      (prisma.url.aggregate as any).mockResolvedValue({ _count: { _all: 200 } });
      (prisma.$queryRaw as any).mockImplementation((query: any) => {
        const queryStr = query?.values?.[0] ?? "";
        if (queryStr.includes('"urlMobile"')) {
          return Promise.resolve([{ withMobile: BigInt(50), desktopOnly: BigInt(150) }]);
        }
        if (queryStr.includes('"urlGroupId"')) {
          return Promise.resolve([{ count: BigInt(10) }]);
        }
        if (queryStr.includes('"lastActiveUrl"')) {
          return Promise.resolve([
            { url: "https://example.com", count: BigInt(100) },
            { url: "https://example2.com", count: BigInt(50) },
            { url: "https://example3.com", count: BigInt(25) },
          ]);
        }
        return Promise.resolve([]);
      });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        system: {
          users: {
            total: 100,
            active: 50,
            withPassword: 80,
            withoutPassword: 20,
            adminRatio: { admin: 5, regular: 95 },
          },
          urlGroups: {
            total: 20,
            unused: 5,
            averageUrlsPerGroup: 4.5,
          },
          urls: {
            total: 200,
            withMobileVersion: 50,
            desktopOnly: 150,
            orphaned: 10,
          },
        },
        userPreferences: {
          themeDistribution: { light: 50, dark: 50 },
          menuPositionDistribution: { left: 60, right: 40 },
        },
        activity: {
          recentlyActive: [
            {
              username: "user1",
              lastActiveUrl: "https://example.com",
              updatedAt: new Date("2024-01-01").toISOString(),
            },
            {
              username: "user2",
              lastActiveUrl: "https://example2.com",
              updatedAt: new Date("2024-01-02").toISOString(),
            },
          ],
          mostAccessedUrls: [
            { url: "https://example.com", count: 100 },
            { url: "https://example2.com", count: 50 },
            { url: "https://example3.com", count: 25 },
          ],
        },
        urlGroups: {
          mostAssigned: [
            { name: "Group 1", userCount: 10, urlCount: 5 },
            { name: "Group 2", userCount: 8, urlCount: 4 },
          ],
        },
      });

      // Verify BigInt values are converted to numbers
      expect(typeof data.system.urls.withMobileVersion).toBe("number");
      expect(typeof data.system.urls.desktopOnly).toBe("number");
      expect(typeof data.system.urls.orphaned).toBe("number");
      expect(
        data.activity.mostAccessedUrls.every((url: any) => typeof url.count === "number"),
      ).toBe(true);
      expect(
        data.urlGroups.mostAssigned.every(
          (group: any) => typeof group.userCount === "number" && typeof group.urlCount === "number",
        ),
      ).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      // Mock no token in cookies
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });
      // Mock token verification to return null
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Mock non-admin user
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "mock_token" }),
      });
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isAdmin: false });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
    });

    it("should handle database errors gracefully", async () => {
      (prisma.user.aggregate as any).mockRejectedValue(new Error("Database error"));

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should return basic statistics when authenticated as admin", async () => {
      (prisma.user.count as any).mockResolvedValue(100);
      (prisma.urlGroup.count as any).mockResolvedValue(20);
      (prisma.url.count as any).mockResolvedValue(200);

      const response = await getBasicStats();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalUsers: 100,
        totalUrlGroups: 20,
        totalUrls: 200,
      });
    });

    it("should return 401 when not authenticated", async () => {
      // Mock no token in cookies
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });
      // Mock token verification to return null
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await getBasicStats();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Mock non-admin user
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "mock_token" }),
      });
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isAdmin: false });

      const response = await getBasicStats();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
    });

    it("should handle database errors gracefully", async () => {
      (prisma.user.count as any).mockRejectedValue(new Error("Database error"));

      const response = await getBasicStats();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });
});
