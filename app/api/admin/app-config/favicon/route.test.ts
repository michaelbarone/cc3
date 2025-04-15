// Mock external modules first
import { DELETE, POST } from "@/app/api/admin/app-config/favicon/route";
import { prisma } from "@/app/lib/db/prisma";
import { createTestAppConfig } from "@/test/utils/fixtures/data/admin-factories";
import { debugMockCalls, debugResponse } from "@/test/utils/helpers/debug";
import { mockVerifyToken } from "@/test/utils/mocks/auth-mock";
import { createTestFile } from "@/test/utils/mocks/file";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Type definitions
type AppConfigMock = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
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

describe("Favicon API Endpoints", () => {
  const publicDir = path.join(process.cwd(), "public");
  const testFaviconPath = path.join(publicDir, "favicon-test.ico");

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ isAdmin: true });
    mockFindUnique.mockResolvedValue(null);
    mockUpdate.mockResolvedValue(defaultAppConfig);
    mockUpsert.mockResolvedValue(faviconAppConfig);
    console.time("test-execution");
  });

  afterEach(async () => {
    console.timeEnd("test-execution");
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
      // Ignore if file doesn't exist
    }
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
      // Arrange
      const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
      mockUpsert.mockResolvedValueOnce(faviconAppConfig);

      // Act
      const response = await POST(createFaviconRequest(testFile));
      const data = await response.json();
      await debugResponse(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.favicon).toMatch(/^\/favicon-\d+\.ico$/);
      expect(mockUpsert).toHaveBeenCalled();
    });

    test("deletes old favicon when uploading new one", async () => {
      // Arrange
      const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
      mockFindUnique.mockResolvedValueOnce(createTestAppConfig({ favicon: "/old-favicon.ico" }));
      mockUpsert.mockResolvedValueOnce(faviconAppConfig);

      // Act
      const response = await POST(createFaviconRequest(testFile));
      await debugResponse(response);

      // Assert
      expect(mockUnlink).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    // Error cases
    describe("error handling", () => {
      test("handles unauthorized access", async () => {
        // Arrange
        mockVerifyToken.mockResolvedValueOnce(null);

        // Act
        const response = await POST(createFaviconRequest());
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      test("handles non-admin access", async () => {
        // Arrange
        mockVerifyToken.mockResolvedValueOnce({ isAdmin: false });

        // Act
        const response = await POST(createFaviconRequest());
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe("Admin privileges required");
      });

      test("handles missing file", async () => {
        // Act
        const response = await POST(createFaviconRequest());
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("No favicon file provided");
      });

      test("handles file too large", async () => {
        // Arrange
        const largeFile = createTestFile("large-favicon.ico", "image/x-icon", 200 * 1024);

        // Act
        const response = await POST(createFaviconRequest(largeFile));
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("File too large (max 100KB)");
      });

      test("handles database error", async () => {
        // Arrange
        const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
        mockUpsert.mockRejectedValueOnce(new Error("Database error"));

        // Act
        const response = await POST(createFaviconRequest(testFile));
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe("Error uploading favicon");
      });
    });
  });

  describe("DELETE /api/admin/app-config/favicon", () => {
    // Happy path tests
    test("successfully deletes favicon", async () => {
      // Arrange
      mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
      mockUpdate.mockResolvedValueOnce(defaultAppConfig);

      // Act
      const response = await DELETE();
      const data = await response.json();
      await debugResponse(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data.favicon).toBeNull();
      expect(mockUnlink).toHaveBeenCalled();
    });

    // Error cases
    describe("error handling", () => {
      test("handles unauthorized access", async () => {
        // Arrange
        mockVerifyToken.mockResolvedValueOnce(null);

        // Act
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      test("handles non-admin access", async () => {
        // Arrange
        mockVerifyToken.mockResolvedValueOnce({ isAdmin: false });

        // Act
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe("Admin privileges required");
      });

      test("handles missing favicon", async () => {
        // Arrange
        mockFindUnique.mockResolvedValueOnce(defaultAppConfig);

        // Act
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("App does not have a favicon");
      });

      test("handles database error", async () => {
        // Arrange
        mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
        mockUpdate.mockRejectedValueOnce(new Error("Database error"));

        // Act
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe("Error deleting favicon");
      });

      test("handles file system error gracefully", async () => {
        // Arrange
        mockFindUnique.mockResolvedValueOnce(faviconAppConfig);
        mockAccess.mockRejectedValueOnce(new Error("File system error"));
        mockUpdate.mockResolvedValueOnce(defaultAppConfig);

        // Act
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.favicon).toBeNull();
      });
    });
  });
});
