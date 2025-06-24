/**
 * Test suite for URL Groups for URL API endpoints
 *
 * Tests the following endpoints:
 * - GET /api/admin/urls/[id]/url-groups - Get URL groups for a specific URL
 * - PUT /api/admin/urls/[id]/url-groups - Update URL groups for a specific URL
 *
 * Each endpoint is tested for:
 * - Authentication and authorization
 * - Input validation
 * - Success cases
 * - Error handling
 *
 * @group API Tests
 * @group Admin
 * @group URLs
 */

import { GET, PUT } from "@/app/api/admin/urls/[id]/url-groups/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createTestUrl, createTestUrlGroup } from "@/test/fixtures/data/factories";
import { debugResponse, measureTestTime } from "@/test/helpers/debug";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Define mock types
type JwtPayload = {
  id: string;
  username: string;
  isAdmin: boolean;
};

// Mock modules
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    urlsInGroups: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    url: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        urlsInGroups: {
          deleteMany: vi.fn(),
          create: vi.fn(),
          findFirst: vi.fn(),
        },
      }),
    ),
  },
}));

describe("URL Groups for URL API", () => {
  const testTimer = measureTestTime("URL Groups for URL API Tests");
  const testUrl = createTestUrl();
  const testUrlGroup1 = createTestUrlGroup({ name: "Group 1" });
  const testUrlGroup2 = createTestUrlGroup({ name: "Group 2" });

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock admin user with required fields
    vi.mocked(verifyToken).mockResolvedValue({
      id: "admin-user-id",
      username: "admin",
      isAdmin: true,
    } as JwtPayload);
  });

  afterAll(() => {
    testTimer.end();
  });

  describe("GET /api/admin/urls/[id]/url-groups", () => {
    it("should return 403 if user is not an admin", async () => {
      const timer = measureTestTime("GET /url-groups - not admin");
      try {
        // Mock non-admin user with required fields
        vi.mocked(verifyToken).mockResolvedValue({
          id: "regular-user-id",
          username: "user",
          isAdmin: false,
        } as JwtPayload);

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups");
        const response = await GET(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
      } finally {
        timer.end();
      }
    });

    it("should return URL groups for a specific URL", async () => {
      const timer = measureTestTime("GET /url-groups - success");
      try {
        const urlInGroups = [
          {
            urlId: testUrl.id,
            groupId: testUrlGroup1.id,
            displayOrder: 0,
            group: testUrlGroup1,
          },
          {
            urlId: testUrl.id,
            groupId: testUrlGroup2.id,
            displayOrder: 1,
            group: testUrlGroup2,
          },
        ];

        vi.mocked(prisma.urlsInGroups.findMany).mockResolvedValue(urlInGroups as any);

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups");
        const response = await GET(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(200);

        // Use toMatchObject to avoid strict date format comparison
        const groups = data as any[];
        expect(groups).toHaveLength(2);
        expect(groups[0].id).toBe(testUrlGroup1.id);
        expect(groups[0].name).toBe(testUrlGroup1.name);
        expect(groups[1].id).toBe(testUrlGroup2.id);
        expect(groups[1].name).toBe(testUrlGroup2.name);

        expect(vi.mocked(prisma.urlsInGroups.findMany)).toHaveBeenCalledWith({
          where: { urlId: testUrl.id },
          include: { group: true },
        });
      } finally {
        timer.end();
      }
    });

    it("should handle errors gracefully", async () => {
      const timer = measureTestTime("GET /url-groups - error");
      try {
        vi.mocked(prisma.urlsInGroups.findMany).mockRejectedValue(new Error("Database error"));

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups");
        const response = await GET(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
      } finally {
        timer.end();
      }
    });
  });

  describe("PUT /api/admin/urls/[id]/url-groups", () => {
    it("should return 403 if user is not an admin", async () => {
      const timer = measureTestTime("PUT /url-groups - not admin");
      try {
        // Mock non-admin user with required fields
        vi.mocked(verifyToken).mockResolvedValue({
          id: "regular-user-id",
          username: "user",
          isAdmin: false,
        } as JwtPayload);

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups", {
          method: "PUT",
          body: JSON.stringify({ urlGroupIds: [testUrlGroup1.id] }),
        });
        const response = await PUT(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
      } finally {
        timer.end();
      }
    });

    it("should return 400 if urlGroupIds is not an array", async () => {
      const timer = measureTestTime("PUT /url-groups - invalid body");
      try {
        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups", {
          method: "PUT",
          body: JSON.stringify({ urlGroupIds: "not-an-array" }),
        });
        const response = await PUT(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid request body. Expected urlGroupIds array." });
      } finally {
        timer.end();
      }
    });

    it("should return 404 if URL does not exist", async () => {
      const timer = measureTestTime("PUT /url-groups - URL not found");
      try {
        vi.mocked(prisma.url.findUnique).mockResolvedValue(null);

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups", {
          method: "PUT",
          body: JSON.stringify({ urlGroupIds: [testUrlGroup1.id] }),
        });
        const response = await PUT(request, { params: Promise.resolve({ id: "non-existent-id" }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL not found" });
      } finally {
        timer.end();
      }
    });

    it("should update URL groups successfully", async () => {
      const timer = measureTestTime("PUT /url-groups - success");
      try {
        // Mock URL exists
        vi.mocked(prisma.url.findUnique).mockResolvedValue(testUrl as any);

        // Mock current assignments
        const currentAssignments = [{ groupId: testUrlGroup1.id }, { groupId: "old-group-id" }];
        vi.mocked(prisma.urlsInGroups.findMany).mockResolvedValue(currentAssignments as any);

        // Mock highest order
        vi.mocked(prisma.urlsInGroups.findFirst).mockResolvedValue({ displayOrder: 5 } as any);

        // Mock transaction operations with any type to avoid type errors
        vi.mocked(prisma.$transaction).mockImplementation((callback) => {
          // Create a minimal mock that satisfies the transaction callback
          const mockTx = {
            urlsInGroups: {
              deleteMany: vi.fn().mockResolvedValue({}),
              create: vi.fn().mockResolvedValue({}),
              findFirst: vi.fn().mockResolvedValue({ displayOrder: 5 }),
            },
          };
          return Promise.resolve(callback(mockTx as any));
        });

        // New groups to assign
        const newGroupIds = [testUrlGroup1.id, testUrlGroup2.id];

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups", {
          method: "PUT",
          body: JSON.stringify({ urlGroupIds: newGroupIds }),
        });
        const response = await PUT(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });

        // Verify transaction was called
        expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
      } finally {
        timer.end();
      }
    });

    it("should handle errors gracefully", async () => {
      const timer = measureTestTime("PUT /url-groups - error");
      try {
        vi.mocked(prisma.url.findUnique).mockRejectedValue(new Error("Database error"));

        const request = new NextRequest("http://localhost/api/admin/urls/123/url-groups", {
          method: "PUT",
          body: JSON.stringify({ urlGroupIds: [testUrlGroup1.id] }),
        });
        const response = await PUT(request, { params: Promise.resolve({ id: testUrl.id }) });
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
      } finally {
        timer.end();
      }
    });
  });
});
