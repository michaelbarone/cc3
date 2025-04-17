import { GET } from "@/app/api/admin/statistics/route";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeepMockProxy } from "vitest-mock-extended";

import { GET as getBasicStats } from "@/app/api/admin/stats/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createMockUser } from "@/test/fixtures/data/factories";

// Mock the auth token verification
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Mock Prisma client with proper typing
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
  return { prisma: mockPrisma as unknown as DeepMockProxy<PrismaClient> };
});

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn().mockReturnValue({ value: "mock_token" }),
  })),
}));

describe("Statistics API Endpoints", () => {
  let mockRequest: NextRequest;
  const mockAdminUser = createMockUser({ isAdmin: true });
  const mockRegularUser = createMockUser({ isAdmin: false });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to admin user
    (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockAdminUser);
    // Default to having a token
    (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "mock_token" }),
    });
    // Create mock request
    mockRequest = new NextRequest(new Request("http://localhost:3000/api/admin/statistics"));
  });

  describe("GET /api/admin/statistics", () => {
    it("should return 401 when not authenticated", async () => {
      const timer = measureTestTime("unauthorized-test");
      try {
        // Mock no token in cookies
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        });
        // Mock token verification to return null
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const response = await GET(mockRequest);
        const data = await debugResponse(response);

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"), {
          request: mockRequest,
        });
        throw error;
      } finally {
        timer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const timer = measureTestTime("non-admin-test");
      try {
        // Mock non-admin user
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock_token" }),
        });
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegularUser);

        const response = await GET(mockRequest);
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"), {
          request: mockRequest,
        });
        throw error;
      } finally {
        timer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const timer = measureTestTime("database-error-test");
      try {
        const dbError = new Error("Database error");
        (prisma.user.aggregate as any).mockRejectedValue(dbError);

        const response = await GET(mockRequest);
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to fetch statistics" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"), {
          mockState: {
            prisma: debugMockCalls(prisma.user.aggregate as any, "user.aggregate"),
            auth: debugMockCalls(verifyToken as any, "verifyToken"),
          },
        });
        throw error;
      } finally {
        timer.end();
      }
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should return basic statistics when authenticated as admin", async () => {
      const timer = measureTestTime("basic-stats-test");
      try {
        (prisma.user.count as any).mockResolvedValue(100);
        (prisma.urlGroup.count as any).mockResolvedValue(20);
        (prisma.url.count as any).mockResolvedValue(200);

        const response = await getBasicStats();
        const data = await debugResponse(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({
          totalUsers: 100,
          totalUrlGroups: 20,
          totalUrls: 200,
        });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"), {
          mockState: {
            userCount: debugMockCalls(prisma.user.count as any, "user.count"),
            urlGroupCount: debugMockCalls(prisma.urlGroup.count as any, "urlGroup.count"),
            urlCount: debugMockCalls(prisma.url.count as any, "url.count"),
          },
        });
        throw error;
      } finally {
        timer.end();
      }
    });

    it("should return 401 when not authenticated", async () => {
      const timer = measureTestTime("unauthorized-basic-stats-test");
      try {
        // Mock no token in cookies
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        });
        // Mock token verification to return null
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const response = await getBasicStats();
        const data = await debugResponse(response);

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"));
        throw error;
      } finally {
        timer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const timer = measureTestTime("non-admin-basic-stats-test");
      try {
        // Mock non-admin user
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock_token" }),
        });
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegularUser);

        const response = await getBasicStats();
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"));
        throw error;
      } finally {
        timer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const timer = measureTestTime("database-error-basic-stats-test");
      try {
        const dbError = new Error("Database error");
        (prisma.user.count as any).mockRejectedValue(dbError);

        const response = await getBasicStats();
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
        expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error("Test failed"), {
          mockState: {
            userCount: debugMockCalls(prisma.user.count as any, "user.count"),
          },
        });
        throw error;
      } finally {
        timer.end();
      }
    });
  });
});
