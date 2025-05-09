// External dependencies first
import { AppConfig } from "@prisma/client";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Internal dependencies
import { prisma } from "@/app/lib/db/prisma";
import { createTestAppConfig } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { mockVerifyToken } from "@/test/mocks/services/auth/auth.mock";

// Import the module under test last
import { DELETE, POST } from "@/app/api/admin/app-config/favicon/route";

// Type definitions
type ErrorResponse = {
  error: string;
};

// Mock external dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: mockVerifyToken,
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Get mock functions
const {
  findUnique: mockFindUnique,
  update: mockUpdate,
  upsert: mockUpsert,
} = vi.mocked(prisma.appConfig);
const { access: mockAccess, unlink: mockUnlink } = vi.mocked(fs);

// Set up mock implementations
const defaultAppConfig = createTestAppConfig({
  favicon: null,
});

const faviconAppConfig = createTestAppConfig({
  favicon: `/favicon-${Date.now()}.ico`,
});

mockFindUnique.mockResolvedValue(null);
mockUpdate.mockResolvedValue(defaultAppConfig);
mockUpsert.mockResolvedValue(faviconAppConfig);
mockAccess.mockResolvedValue(undefined);
mockUnlink.mockResolvedValue(undefined);

const createMockFile = (overrides = {}) => {
  const defaults = {
    content: "test",
    name: "test-favicon.ico",
    type: "image/x-icon",
    size: 50 * 1024,
  };
  const config = { ...defaults, ...overrides };
  // Create a buffer of the specified size
  const content =
    config.size === defaults.size
      ? config.content
      : Buffer.from("x".repeat(config.size)).toString();
  return new File([content], config.name, { type: config.type });
};

describe("Favicon API Endpoints", () => {
  const suiteTimer = measureTestTime("Favicon API Suite");
  const publicDir = path.join(process.cwd(), "public");
  const testFaviconPath = path.join(publicDir, "favicon-test.ico");

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ isAdmin: true });
    mockFindUnique.mockResolvedValue(null);
    mockUpdate.mockResolvedValue(defaultAppConfig);
    mockUpsert.mockResolvedValue(faviconAppConfig);
  });

  afterEach(async () => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(mockVerifyToken), "verifyToken");
    debugMockCalls(vi.mocked(mockFindUnique), "appConfig.findUnique");
    debugMockCalls(vi.mocked(mockUpdate), "appConfig.update");
    debugMockCalls(vi.mocked(mockUpsert), "appConfig.upsert");
    debugMockCalls(vi.mocked(mockAccess), "fs.access");
    debugMockCalls(vi.mocked(mockUnlink), "fs.unlink");

    // Clean up test files
    try {
      await fs.access(testFaviconPath);
      await fs.unlink(testFaviconPath);
    } catch (error) {
      debugError(error as Error, { path: testFaviconPath });
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("POST /api/admin/app-config/favicon", () => {
    const createFaviconRequest = (file?: File) => {
      const formData = new FormData();
      if (file) {
        formData.append("favicon", file);
      }
      return new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });
    };

    // Happy path tests
    test("successfully uploads favicon", async () => {
      const testTimer = measureTestTime("upload favicon test");
      try {
        // Arrange
        const testFile = createMockFile();
        mockUpsert.mockResolvedValueOnce(faviconAppConfig);

        // Act
        const response = await POST(createFaviconRequest(testFile));
        const data = (await debugResponse(response)) as AppConfig;

        // Assert
        expect(response.status).toBe(200);
        expect(data.favicon).toMatch(/^\/favicon-\d+\.ico$/);
        expect(mockUpsert).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("deletes old favicon when uploading new one", async () => {
      const testTimer = measureTestTime("delete old favicon test");
      try {
        // Arrange
        const testFile = createMockFile();
        mockFindUnique.mockResolvedValueOnce(createTestAppConfig({ favicon: "/old-favicon.ico" }));
        mockUpsert.mockResolvedValueOnce(faviconAppConfig);

        // Act
        const response = await POST(createFaviconRequest(testFile));
        const data = (await debugResponse(response)) as AppConfig;

        // Assert
        expect(mockUnlink).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    // Error cases
    describe("error handling", () => {
      test("handles unauthorized access", async () => {
        const testTimer = measureTestTime("unauthorized test");
        try {
          // Arrange
          mockVerifyToken.mockResolvedValueOnce(null);

          // Act
          const response = await POST(createFaviconRequest());
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(401);
          expect(data.error).toBe("Unauthorized");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles non-admin access", async () => {
        const testTimer = measureTestTime("forbidden test");
        try {
          // Arrange
          mockVerifyToken.mockResolvedValueOnce({ isAdmin: false });

          // Act
          const response = await POST(createFaviconRequest());
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(403);
          expect(data.error).toBe("Admin privileges required");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles missing file", async () => {
        const testTimer = measureTestTime("missing file test");
        try {
          // Act
          const response = await POST(createFaviconRequest());
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(400);
          expect(data.error).toBe("No favicon file provided");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles file too large", async () => {
        const testTimer = measureTestTime("file too large test");
        try {
          // Arrange
          const largeFile = createMockFile({ size: 200 * 1024 });

          // Act
          const response = await POST(createFaviconRequest(largeFile));
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(400);
          expect(data.error).toBe("File too large (max 100KB)");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles database error", async () => {
        const testTimer = measureTestTime("database error test");
        try {
          // Arrange
          const testFile = createMockFile();
          const dbError = new Error("Database error");
          mockUpsert.mockRejectedValueOnce(dbError);

          // Act
          const response = await POST(createFaviconRequest(testFile));
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(500);
          expect(data.error).toBe("Error uploading favicon");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } catch (error) {
          debugError(error as Error, {
            upsert: mockUpsert.mock.calls,
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

  describe("DELETE /api/admin/app-config/favicon", () => {
    // Happy path tests
    test("successfully deletes favicon", async () => {
      const testTimer = measureTestTime("delete favicon test");
      try {
        // Arrange
        mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
        mockUpdate.mockResolvedValueOnce(defaultAppConfig);

        // Act
        const response = await DELETE();
        const data = (await debugResponse(response)) as AppConfig;

        // Assert
        expect(response.status).toBe(200);
        expect(data.favicon).toBeNull();
        expect(mockUnlink).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    // Error cases
    describe("error handling", () => {
      test("handles unauthorized access", async () => {
        const testTimer = measureTestTime("unauthorized delete test");
        try {
          // Arrange
          mockVerifyToken.mockResolvedValueOnce(null);

          // Act
          const response = await DELETE();
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(401);
          expect(data.error).toBe("Unauthorized");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles non-admin access", async () => {
        const testTimer = measureTestTime("non-admin delete test");
        try {
          // Arrange
          mockVerifyToken.mockResolvedValueOnce({ isAdmin: false });

          // Act
          const response = await DELETE();
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(403);
          expect(data.error).toBe("Admin privileges required");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles missing favicon", async () => {
        const testTimer = measureTestTime("missing favicon test");
        try {
          // Arrange
          mockFindUnique.mockResolvedValueOnce(defaultAppConfig);

          // Act
          const response = await DELETE();
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(400);
          expect(data.error).toBe("App does not have a favicon");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        } finally {
          testTimer.end();
        }
      });

      test("handles database error", async () => {
        const testTimer = measureTestTime("database error test");
        try {
          // Arrange
          mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
          mockUpdate.mockRejectedValueOnce(new Error("Database error"));

          // Act
          const response = await DELETE();
          const data = (await debugResponse(response)) as ErrorResponse;

          // Assert
          expect(response.status).toBe(500);
          expect(data.error).toBe("Error deleting favicon");
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } catch (error) {
          debugError(error as Error, {
            update: mockUpdate.mock.calls,
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

      test("handles file system error gracefully", async () => {
        const testTimer = measureTestTime("file system error test");
        try {
          // Arrange
          mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
          mockAccess.mockRejectedValueOnce(new Error("File system error"));
          mockUpdate.mockResolvedValueOnce(defaultAppConfig);

          // Act
          const response = await DELETE();
          const data = (await debugResponse(response)) as AppConfig;

          // Assert
          expect(response.status).toBe(200);
          expect(data.favicon).toBeNull();
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } finally {
          testTimer.end();
        }
      });
    });
  });
});
