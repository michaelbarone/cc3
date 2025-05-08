import {
  DELETE as deleteUrlGroup,
  GET as getUrlGroup,
  RouteContext,
  PUT as updateUrlGroup,
} from "@/app/api/admin/url-groups/[id]/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createTestUrl, createTestUrlGroup } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Setup mocks first
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    urlGroup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    urlsInGroups: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    url: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock cookie store
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

// Define response types
type UrlInGroup = {
  id: string;
  title: string;
  url: string;
  iconPath: string | null;
  idleTimeoutMinutes: number | null;
  displayOrder: number;
};

type UrlGroupResponse = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  urls: UrlInGroup[];
};

type ErrorResponse = {
  error: string;
};

type SuccessResponse = {
  success: boolean;
};

describe("Admin URL Group API", () => {
  const suiteTimer = measureTestTime("Admin URL Group API Suite");

  // Mock data
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

  const mockDate = new Date("2025-01-01T00:00:00.000Z");
  const mockDateString = mockDate.toISOString();

  const mockUrlGroup = createTestUrlGroup({
    id: "test-group-id",
    name: "Test Group",
    description: "Test description",
    createdAt: mockDateString,
    updatedAt: mockDateString,
    urls: [
      {
        url: createTestUrl({
          id: "url-id",
          title: "Test URL",
          url: "https://example.com",
          urlMobile: "https://m.example.com",
          iconPath: "/icons/test.png",
          idleTimeoutMinutes: 10,
          createdAt: mockDateString,
          updatedAt: mockDateString,
        }),
        displayOrder: 1,
      },
    ],
  });

  // Helper to create route context with params
  const createRouteContext = (id: string): RouteContext => ({
    params: Promise.resolve({ id }),
  });

  beforeEach(() => {
    const setupTimer = measureTestTime("Test Setup");
    try {
      vi.clearAllMocks();

      // Setup auth mock
      mockCookieStore.get.mockReturnValue({ value: "valid_token" });
      (verifyToken as Mock).mockResolvedValue(mockAdminUser);

      // Setup Prisma mock
      (prisma.$queryRaw as Mock).mockResolvedValue([mockUrlGroup]);
      (prisma.urlGroup.findUnique as Mock).mockResolvedValue(mockUrlGroup);
    } finally {
      setupTimer.end();
    }
  });

  afterEach(() => {
    const cleanupTimer = measureTestTime("Test Cleanup");
    try {
      debugMockCalls(verifyToken as Mock, "verifyToken");
      debugMockCalls(prisma.$queryRaw as Mock, "prisma.$queryRaw");
      debugMockCalls(prisma.urlGroup.findUnique as Mock, "prisma.urlGroup.findUnique");
      debugMockCalls(prisma.urlGroup.update as Mock, "prisma.urlGroup.update");
      debugMockCalls(prisma.urlGroup.delete as Mock, "prisma.urlGroup.delete");
    } finally {
      cleanupTimer.end();
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Get URL Group - Admin");
      try {
        // Arrange
        (prisma.$queryRaw as Mock).mockResolvedValue([mockUrlGroup]);

        // Act
        const response = await getUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<UrlGroupResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrlGroup);
        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            prismaQuery: (prisma.$queryRaw as Mock).mock.calls,
            verifyToken: (verifyToken as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime("Get URL Group - Unauthorized");
      try {
        // Arrange
        mockCookieStore.get.mockReturnValue(undefined);

        // Act
        const response = await getUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("Get URL Group - Forbidden");
      try {
        // Arrange
        (verifyToken as Mock).mockResolvedValue(mockNonAdminUser);

        // Act
        const response = await getUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Get URL Group - Not Found");
      try {
        // Arrange
        (prisma.$queryRaw as Mock).mockResolvedValue([]);

        // Act
        const response = await getUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext("non-existent-id"),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            prismaQuery: (prisma.$queryRaw as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime("Get URL Group - Database Error");
      try {
        // Arrange
        const dbError = new Error("Database error");
        (prisma.$queryRaw as Mock).mockRejectedValue(dbError);

        // Act
        const response = await getUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            prismaQuery: (prisma.$queryRaw as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("PUT /api/admin/url-groups/[id]", () => {
    const createUpdateData = (overrides = {}) => ({
      name: "Updated Group",
      description: "Updated Description",
      ...overrides,
    });

    it("should update URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Update URL Group - Success");
      try {
        // Arrange
        const updateData = createUpdateData();
        const updatedUrlGroup = { ...mockUrlGroup, ...updateData };

        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.update as Mock).mockResolvedValue(updatedUrlGroup);

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext(mockUrlGroup.id));
        const data = await debugResponse<UrlGroupResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual(updatedUrlGroup);
        expect(prisma.urlGroup.update).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
          data: {
            name: updateData.name,
            description: updateData.description,
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
            update: (prisma.urlGroup.update as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime("Update URL Group - Unauthorized");
      try {
        // Arrange
        mockCookieStore.get.mockReturnValue(undefined);
        const updateData = createUpdateData();

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext(mockUrlGroup.id));
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(prisma.urlGroup.update).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("Update URL Group - Forbidden");
      try {
        // Arrange
        (verifyToken as Mock).mockResolvedValue(mockNonAdminUser);
        const updateData = createUpdateData();

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext(mockUrlGroup.id));
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(prisma.urlGroup.update).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Update URL Group - Not Found");
      try {
        // Arrange
        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(null);
        const updateData = createUpdateData();

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext("non-existent-id"));
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
        expect(prisma.urlGroup.update).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should validate required name field", async () => {
      const testTimer = measureTestTime("Update URL Group - Validation Error");
      try {
        // Arrange
        const updateData = createUpdateData({ name: "" });

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext(mockUrlGroup.id));
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Group name is required" });
        expect(prisma.urlGroup.update).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime("Update URL Group - Database Error");
      try {
        // Arrange
        const updateData = createUpdateData();
        const dbError = new Error("Database error");

        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.update as Mock).mockRejectedValue(dbError);

        // Act
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const response = await updateUrlGroup(request, createRouteContext(mockUrlGroup.id));
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          error,
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
            update: (prisma.urlGroup.update as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    it("should delete URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Delete URL Group - Success");
      try {
        // Arrange
        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.delete as Mock).mockResolvedValue(mockUrlGroup);

        // Act
        const response = await deleteUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<SuccessResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(prisma.urlGroup.delete).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
            delete: (prisma.urlGroup.delete as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime("Delete URL Group - Unauthorized");
      try {
        // Arrange
        mockCookieStore.get.mockReturnValue(undefined);

        // Act
        const response = await deleteUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("Delete URL Group - Forbidden");
      try {
        // Arrange
        (verifyToken as Mock).mockResolvedValue(mockNonAdminUser);

        // Act
        const response = await deleteUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Delete URL Group - Not Found");
      try {
        // Arrange
        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(null);

        // Act
        const response = await deleteUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext("non-existent-id"),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
        expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime("Delete URL Group - Database Error");
      try {
        // Arrange
        const dbError = new Error("Database error");
        (prisma.urlGroup.findUnique as Mock).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.delete as Mock).mockRejectedValue(dbError);

        // Act
        const response = await deleteUrlGroup(
          new NextRequest("http://localhost"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse<ErrorResponse>(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          error,
          mockState: {
            findUnique: (prisma.urlGroup.findUnique as Mock).mock.calls,
            delete: (prisma.urlGroup.delete as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
