import { vi } from "vitest";

// Mock next/headers before any imports
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { debugResponse, measureTestTime } from "@/test/helpers/debug";
import { mockVerifyToken, setupAuthMocks } from "@/test/mocks/services/auth/auth.mock";
import { createMockCookieStore, mockNextHeaders } from "@/test/mocks/services/next";
import { PrismaMock } from "@/test/mocks/services/prisma/prisma.mock";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, PUT, RouteContext } from "./route";

// Create test timer for the entire test suite
const timer = measureTestTime();

// Create mock prisma client
const mockPrisma = PrismaMock.getInstance();
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Setup auth mocks
setupAuthMocks();

describe("URL Group API", () => {
  const suiteTimer = measureTestTime();

  // Create test data using factories
  const mockUrlGroup = {
    id: "test-group-1",
    name: "Test Group",
    description: "Test Description",
    createdAt: new Date(),
    updatedAt: new Date(),
    urls: [],
  };

  const mockAdmin = {
    id: "admin-1",
    name: "Admin User",
    email: "admin@test.com",
    isAdmin: true,
  };

  const mockUser = {
    id: "user-1",
    name: "Regular User",
    email: "user@test.com",
    isAdmin: false,
  };

  let cookieStore: ReturnType<typeof createMockCookieStore>;

  // Helper to create NextRequest with params
  const createNextRequest = (method: string = "GET", body?: any) => {
    const url = `http://localhost/api/admin/url-groups/${mockUrlGroup.id}`;
    return new NextRequest(url, {
      method,
      ...(body && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  };

  // Helper to create route context with params
  const createRouteContext = (id: string): RouteContext => ({
    params: Promise.resolve({ id }),
  });

  beforeEach(() => {
    // Reset all mocks
    PrismaMock.reset();
    vi.clearAllMocks();

    // Set up cookie store mock
    cookieStore = createMockCookieStore();
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "auth_token") {
        return { value: "admin_token" };
      }
      return undefined;
    });

    // Set up headers mock with cookie store
    mockNextHeaders(cookieStore);

    // Setup auth mock responses
    mockVerifyToken.mockImplementation(async (token?: string) => {
      if (!token) return null;
      if (token === "admin_token") return mockAdmin;
      if (token === "user_token") return mockUser;
      return null;
    });
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        mockPrisma.$queryRaw.mockResolvedValueOnce([mockUrlGroup]);

        // Act
        const response = await GET(createNextRequest(), createRouteContext(mockUrlGroup.id));
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrlGroup);
        expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(String));
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            prismaQuery: mockPrisma.$queryRaw.mock.calls,
            verifyToken: mockVerifyToken.mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue(undefined);

        // Act
        const response = await GET(createNextRequest(), createRouteContext(mockUrlGroup.id));
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue({ value: "user_token" });

        // Act
        const response = await GET(createNextRequest(), createRouteContext(mockUrlGroup.id));
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        mockPrisma.$queryRaw.mockResolvedValueOnce([]);

        // Act
        const response = await GET(createNextRequest(), createRouteContext(mockUrlGroup.id));
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        const dbError = new Error("Database error");
        mockPrisma.$queryRaw.mockRejectedValueOnce(dbError);

        // Act
        const response = await GET(createNextRequest(), createRouteContext(mockUrlGroup.id));
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });

        // Log error for debugging
        console.error("Database operation failed:", {
          error: dbError.message,
          stack: dbError.stack,
          mockState: {
            prismaQuery: mockPrisma.$queryRaw.mock.calls,
          },
        });
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
      const testTimer = measureTestTime();
      try {
        // Arrange
        const updateData = createUpdateData();
        const updatedUrlGroup = { ...mockUrlGroup, ...updateData };

        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(mockUrlGroup);
        mockPrisma.urlGroup.update.mockResolvedValueOnce(updatedUrlGroup);

        // Act
        const response = await PUT(
          createNextRequest("PUT", updateData),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual(updatedUrlGroup);
        expect(mockPrisma.urlGroup.update).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
          data: updateData,
        });
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            findUnique: mockPrisma.urlGroup.findUnique.mock.calls,
            update: mockPrisma.urlGroup.update.mock.calls,
            verifyToken: mockVerifyToken.mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue(undefined);
        const updateData = createUpdateData();

        // Act
        const response = await PUT(
          createNextRequest("PUT", updateData),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(mockPrisma.urlGroup.update).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue({ value: "user_token" });
        const updateData = createUpdateData();

        // Act
        const response = await PUT(
          createNextRequest("PUT", updateData),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(mockPrisma.urlGroup.update).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(null);
        const updateData = createUpdateData();

        // Act
        const response = await PUT(
          createNextRequest("PUT", updateData),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
        expect(mockPrisma.urlGroup.update).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        const dbError = new Error("Database error");
        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(mockUrlGroup);
        mockPrisma.urlGroup.update.mockRejectedValueOnce(dbError);
        const updateData = createUpdateData();

        // Act
        const response = await PUT(
          createNextRequest("PUT", updateData),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });

        // Log error for debugging
        console.error("Database operation failed:", {
          error: dbError.message,
          stack: dbError.stack,
          mockState: {
            findUnique: mockPrisma.urlGroup.findUnique.mock.calls,
            update: mockPrisma.urlGroup.update.mock.calls,
          },
        });
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    it("should delete URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(mockUrlGroup);
        mockPrisma.urlGroup.delete.mockResolvedValueOnce(mockUrlGroup);

        // Act
        const response = await DELETE(
          createNextRequest("DELETE"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(mockPrisma.urlGroup.delete).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
        });
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            findUnique: mockPrisma.urlGroup.findUnique.mock.calls,
            delete: mockPrisma.urlGroup.delete.mock.calls,
            verifyToken: mockVerifyToken.mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when no token is present", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue(undefined);

        // Act
        const response = await DELETE(
          createNextRequest("DELETE"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(mockPrisma.urlGroup.delete).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        cookieStore.get.mockReturnValue({ value: "user_token" });

        // Act
        const response = await DELETE(
          createNextRequest("DELETE"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });
        expect(mockPrisma.urlGroup.delete).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(null);

        // Act
        const response = await DELETE(
          createNextRequest("DELETE"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "URL group not found" });
        expect(mockPrisma.urlGroup.delete).not.toHaveBeenCalled();
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime();
      try {
        // Arrange
        const dbError = new Error("Database error");
        mockPrisma.urlGroup.findUnique.mockResolvedValueOnce(mockUrlGroup);
        mockPrisma.urlGroup.delete.mockRejectedValueOnce(dbError);

        // Act
        const response = await DELETE(
          createNextRequest("DELETE"),
          createRouteContext(mockUrlGroup.id),
        );
        const data = await debugResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });

        // Log error for debugging
        console.error("Database operation failed:", {
          error: dbError.message,
          stack: dbError.stack,
          mockState: {
            findUnique: mockPrisma.urlGroup.findUnique.mock.calls,
            delete: mockPrisma.urlGroup.delete.mock.calls,
          },
        });
      } finally {
        testTimer.end();
      }
    });
  });
});
