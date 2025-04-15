import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeepMockProxy } from "vitest-mock-extended";

import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { logTestTiming } from "@/app/lib/test/debug";
import { createMockUser } from "@/app/lib/test/factories";

import { GET as getStatistics } from "@/app/api/admin/statistics/route";
import { GET as getBasicStats } from "@/app/api/admin/stats/route";

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
      const startTime = performance.now();
      try {
        // Mock no token in cookies
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        });
        // Mock token verification to return null
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const response = await getStatistics(mockRequest);
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(401);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Unauthorized" });
      } catch (error) {
        console.error("Test failed:", { error, request: mockRequest });
        throw error;
      } finally {
        logTestTiming("Unauthorized test", startTime);
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const startTime = performance.now();
      try {
        // Mock non-admin user
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock_token" }),
        });
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegularUser);

        const response = await getStatistics(mockRequest);
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(403);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Forbidden" });
      } catch (error) {
        console.error("Test failed:", { error, request: mockRequest });
        throw error;
      } finally {
        logTestTiming("Non-admin test", startTime);
      }
    });

    it("should handle database errors gracefully", async () => {
      const startTime = performance.now();
      try {
        const dbError = new Error("Database error");
        (prisma.user.aggregate as any).mockRejectedValue(dbError);

        const response = await getStatistics(mockRequest);
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(500);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Failed to fetch statistics" });
      } catch (error) {
        console.error("Test failed:", {
          error,
          request: mockRequest,
          mockState: {
            prisma: prisma.user.aggregate.mock.calls,
            auth: verifyToken.mock.calls,
          },
        });
        throw error;
      } finally {
        logTestTiming("Database error test", startTime);
      }
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should return basic statistics when authenticated as admin", async () => {
      const startTime = performance.now();
      try {
        (prisma.user.count as any).mockResolvedValue(100);
        (prisma.urlGroup.count as any).mockResolvedValue(20);
        (prisma.url.count as any).mockResolvedValue(200);

        const response = await getBasicStats();
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(200);
        const data = JSON.parse(responseText);
        expect(data).toEqual({
          totalUsers: 100,
          totalUrlGroups: 20,
          totalUrls: 200,
        });
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            userCount: prisma.user.count.mock.calls,
            urlGroupCount: prisma.urlGroup.count.mock.calls,
            urlCount: prisma.url.count.mock.calls,
          },
        });
        throw error;
      } finally {
        logTestTiming("Basic stats test", startTime);
      }
    });

    it("should return 401 when not authenticated", async () => {
      const startTime = performance.now();
      try {
        // Mock no token in cookies
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        });
        // Mock token verification to return null
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const response = await getBasicStats();
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(401);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Unauthorized" });
      } catch (error) {
        console.error("Test failed:", { error });
        throw error;
      } finally {
        logTestTiming("Unauthorized basic stats test", startTime);
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const startTime = performance.now();
      try {
        // Mock non-admin user
        (cookies as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock_token" }),
        });
        (verifyToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegularUser);

        const response = await getBasicStats();
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(403);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Forbidden" });
      } catch (error) {
        console.error("Test failed:", { error });
        throw error;
      } finally {
        logTestTiming("Non-admin basic stats test", startTime);
      }
    });

    it("should handle database errors gracefully", async () => {
      const startTime = performance.now();
      try {
        const dbError = new Error("Database error");
        (prisma.user.count as any).mockRejectedValue(dbError);

        const response = await getBasicStats();
        const responseText = await response.text();

        // Debug using the text
        console.log("Response debug:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          bodyUsed: true,
        });

        expect(response.status).toBe(500);
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Internal Server Error" });
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            userCount: prisma.user.count.mock.calls,
          },
        });
        throw error;
      } finally {
        logTestTiming("Database error basic stats test", startTime);
      }
    });
  });
});
