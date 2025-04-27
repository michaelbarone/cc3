import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createMockUser, createTestUrl, createTestUrlGroup } from "@/test/fixtures/data/factories";
import { debugError, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: "mock_token" }),
  }),
}));

vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    urlGroup: {
      findUnique: vi.fn(),
    },
    url: {
      findMany: vi.fn(),
    },
    urlsInGroups: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: 0 } }),
    },
    $transaction: async (fn: any) => {
      return await fn(prisma);
    },
  },
}));

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

describe("URL Groups Batch API", () => {
  const mockUser = createMockUser({ isAdmin: true });
  const mockUrlGroup = createTestUrlGroup();
  const mockUrls = [createTestUrl(), createTestUrl()];

  beforeEach(() => {
    vi.clearAllMocks();
    (verifyToken as any).mockResolvedValue(mockUser);
    (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
    (prisma.url.findMany as any).mockResolvedValue(mockUrls);
    (prisma.urlsInGroups.aggregate as any).mockResolvedValue({ _max: { displayOrder: 0 } });
  });

  test("should add URLs to group", async () => {
    const testTimer = measureTestTime("add urls test");
    try {
      const context: RouteContext = {
        params: Promise.resolve({ id: mockUrlGroup.id }),
      };

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "add",
          urlIds: mockUrls.map((url) => url.id),
        }),
      });

      (prisma.urlsInGroups.createMany as any).mockResolvedValue({ count: mockUrls.length });

      const response = await POST(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        success: true,
      });

      expect(prisma.urlsInGroups.createMany).toHaveBeenCalledWith({
        data: mockUrls.map((url, index) => ({
          urlId: url.id,
          groupId: mockUrlGroup.id,
          displayOrder: expect.any(Number),
        })),
      });

      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } catch (error) {
      debugError(error as Error, {
        mockState: {
          verifyToken: (verifyToken as any).mock.calls,
          createMany: (prisma.urlsInGroups.createMany as any).mock.calls,
        },
      });
      throw error;
    } finally {
      testTimer.end();
    }
  });

  test("should handle unauthorized access", async () => {
    const testTimer = measureTestTime("unauthorized test");
    try {
      (verifyToken as any).mockResolvedValue({ ...mockUser, isAdmin: false });

      const context: RouteContext = {
        params: Promise.resolve({ id: mockUrlGroup.id }),
      };

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "add",
          urlIds: mockUrls.map((url) => url.id),
        }),
      });

      const response = await POST(request, context);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({
        error: "Forbidden",
      });

      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } catch (error) {
      debugError(error as Error, {
        mockState: {
          verifyToken: (verifyToken as any).mock.calls,
        },
      });
      throw error;
    } finally {
      testTimer.end();
    }
  });

  test("should handle invalid group ID", async () => {
    const testTimer = measureTestTime("invalid group test");
    try {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const context: RouteContext = {
        params: Promise.resolve({ id: "invalid_id" }),
      };

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "add",
          urlIds: mockUrls.map((url) => url.id),
        }),
      });

      const response = await POST(request, context);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({
        error: "URL group not found",
      });

      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } catch (error) {
      debugError(error as Error, {
        mockState: {
          verifyToken: (verifyToken as any).mock.calls,
          findUnique: (prisma.urlGroup.findUnique as any).mock.calls,
        },
      });
      throw error;
    } finally {
      testTimer.end();
    }
  });
});
