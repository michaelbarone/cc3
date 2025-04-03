import { cookies } from "next/headers";
import { NextRequest } from "next/server";
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
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to admin user
    (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isAdmin: true });
    // Default to having a token
    (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "mock_token" }),
    });
    // Create mock request
    mockRequest = new NextRequest(new Request("http://localhost:3000/api/admin/statistics"));
  });

  describe("GET /api/admin/statistics", () => {
    it("should return 401 when not authenticated", async () => {
      // Mock no token in cookies
      (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });
      // Mock token verification to return null
      (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response = await getStatistics(mockRequest);
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

      const response = await getStatistics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
    });

    it("should handle database errors gracefully", async () => {
      (prisma.user.aggregate as any).mockRejectedValue(new Error("Database error"));

      const response = await getStatistics(mockRequest);
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
