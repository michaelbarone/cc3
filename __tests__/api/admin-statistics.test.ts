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
    (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isAdmin: true });
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
          updatedAt: new Date(),
        },
        {
          username: "user2",
          lastActiveUrl: "https://example2.com",
          updatedAt: new Date(),
        },
      ]);

      (prisma.urlGroup.aggregate as any).mockResolvedValue({ _count: { _all: 20 } });
      (prisma.urlGroup.findMany as any).mockImplementation((args: any) => {
        if (args.include?._count) {
          return Promise.resolve([
            {
              name: "Group 1",
              _count: { userUrlGroups: 10, urls: 5 },
            },
          ]);
        }
        return Promise.resolve([
          {
            name: "Group 1",
            _count: { urls: 5 },
          },
        ]);
      });
      (prisma.urlGroup.count as any).mockResolvedValue(5);

      (prisma.url.aggregate as any).mockResolvedValue({ _count: { _all: 200 } });
      (prisma.$queryRaw as any).mockImplementation((query: any) => {
        const queryStr = query?.values?.[0] ?? '';
        if (queryStr.includes('"urlMobile"')) {
          return Promise.resolve([{ withMobile: BigInt(50), desktopOnly: BigInt(150) }]);
        }
        if (queryStr.includes('"urlGroupId"')) {
          return Promise.resolve([{ count: BigInt(10) }]);
        }
        if (queryStr.includes('"lastActiveUrl"')) {
          return Promise.resolve([
            { title: "Example", url: "https://example.com", count: BigInt(100) },
            { title: "Example 2", url: "https://example2.com", count: BigInt(50) },
            { title: "Example 3", url: "https://example3.com", count: BigInt(25) },
          ]);
        }
        return Promise.resolve([]);
      });

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        system: expect.objectContaining({
          users: expect.objectContaining({
            total: 100,
            active: 50,
            withPassword: 80,
            withoutPassword: 20,
            adminRatio: { admin: 5, regular: 95 },
          }),
          urlGroups: expect.objectContaining({
            total: 20,
            unused: 5,
            averageUrlsPerGroup: expect.any(Number),
          }),
          urls: expect.objectContaining({
            total: 200,
            withMobileVersion: 50,
            desktopOnly: 150,
            orphaned: 10,
          }),
        }),
        userPreferences: expect.objectContaining({
          themeDistribution: expect.any(Object),
          menuPositionDistribution: expect.any(Object),
        }),
        activity: expect.objectContaining({
          recentlyActive: expect.arrayContaining([
            expect.objectContaining({
              username: expect.any(String),
              lastActiveUrl: expect.any(String),
              updatedAt: expect.any(String),
            }),
          ]),
          mostAccessedUrls: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              url: expect.any(String),
              count: expect.any(Number),
            }),
          ]),
        }),
      }));
    });

    it("should return 401 when not authenticated", async () => {
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

      const response = await getStatistics();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
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
      expect(data).toEqual({ error: "Failed to fetch statistics" });
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
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });

      const response = await getBasicStats();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
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
