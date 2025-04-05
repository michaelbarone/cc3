import { mockVerifyToken } from "@/app/lib/test/auth-mock";
import { createTestFile } from "@/app/lib/test/file-mock";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DELETE, POST } from "../favicon/route";

// Mock external dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: mockVerifyToken,
}));

type AppConfigMock = {
  id: string;
  appName?: string;
  favicon: string | null;
  loginTheme?: string;
  registrationEnabled?: boolean;
};

const mockFindUnique = vi
  .fn()
  .mockImplementation(() => Promise.resolve<AppConfigMock | null>(null));
const mockUpdate = vi
  .fn()
  .mockImplementation(() => Promise.resolve<AppConfigMock>({ id: "app-config", favicon: null }));
const mockUpsert = vi
  .fn()
  .mockImplementation(() =>
    Promise.resolve<AppConfigMock>({ id: "app-config", favicon: "/favicon-test.ico" }),
  );

// Create mock functions for fs operations
const mockAccess = vi.fn().mockImplementation(() => Promise.resolve());
const mockUnlink = vi.fn().mockImplementation(() => Promise.resolve());

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      upsert: mockUpsert,
    },
  } as unknown as PrismaClient,
}));

vi.mock("fs/promises", () => ({
  default: {
    access: mockAccess,
    unlink: mockUnlink,
  },
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("Favicon API Endpoints", () => {
  const publicDir = path.join(process.cwd(), "public");
  const testFaviconPath = path.join(publicDir, "favicon-test.ico");

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockVerifyToken.mockResolvedValue({ isAdmin: true });
  });

  afterEach(async () => {
    // Clean up any test files
    try {
      await fs.access(testFaviconPath);
      await fs.unlink(testFaviconPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe("POST /api/admin/app-config/favicon", () => {
    test("successfully uploads favicon", async () => {
      // Mock database responses
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({
        id: "app-config",
        appName: "Control Center",
        favicon: "/favicon-test.ico",
        loginTheme: "dark",
        registrationEnabled: false,
      });

      // Create test file
      const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
      const formData = new FormData();
      formData.append("favicon", testFile);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favicon).toMatch(/^\/favicon-\d+\.ico$/);
      expect(mockUpsert).toHaveBeenCalled();
    });

    test("handles unauthorized access", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    test("handles non-admin access", async () => {
      mockVerifyToken.mockResolvedValue({ isAdmin: false });

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin privileges required");
    });

    test("handles missing file", async () => {
      const formData = new FormData();
      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No favicon file provided");
    });

    test("handles file too large", async () => {
      const testFile = createTestFile("large-favicon.ico", "image/x-icon", 200 * 1024);
      const formData = new FormData();
      formData.append("favicon", testFile);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("File too large (max 100KB)");
    });

    test("handles invalid file type", async () => {
      const testFile = createTestFile("invalid.txt", "text/plain", 50 * 1024);
      const formData = new FormData();
      formData.append("favicon", testFile);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("File must be an image");
    });

    test("handles database error", async () => {
      mockUpsert.mockRejectedValue(new Error("Database error"));

      const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
      const formData = new FormData();
      formData.append("favicon", testFile);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error uploading favicon");
    });

    test("deletes old favicon when uploading new one", async () => {
      // Mock existing favicon
      mockFindUnique.mockResolvedValue({
        id: "app-config",
        favicon: "/old-favicon.ico",
      });

      mockUpsert.mockResolvedValue({
        id: "app-config",
        favicon: "/favicon-test.ico",
      });

      const testFile = createTestFile("test-favicon.ico", "image/x-icon", 50 * 1024);
      const formData = new FormData();
      formData.append("favicon", testFile);

      const request = new NextRequest("http://localhost/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/app-config/favicon", () => {
    test("successfully deletes favicon", async () => {
      mockFindUnique.mockResolvedValue({
        id: "app-config",
        favicon: "/favicon-test.ico",
      });

      mockUpdate.mockResolvedValue({
        id: "app-config",
        favicon: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favicon).toBeNull();
      expect(mockUnlink).toHaveBeenCalled();
    });

    test("handles unauthorized access", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    test("handles non-admin access", async () => {
      mockVerifyToken.mockResolvedValue({ isAdmin: false });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin privileges required");
    });

    test("handles missing favicon", async () => {
      mockFindUnique.mockResolvedValue({
        id: "app-config",
        favicon: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("App does not have a favicon");
    });

    test("handles database error", async () => {
      mockFindUnique.mockResolvedValue({
        id: "app-config",
        favicon: "/favicon-test.ico",
      });

      mockUpdate.mockRejectedValue(new Error("Database error"));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error deleting favicon");
    });

    test("handles file system error gracefully", async () => {
      mockFindUnique.mockResolvedValue({
        id: "app-config",
        favicon: "/favicon-test.ico",
      });

      mockAccess.mockRejectedValue(new Error("File system error"));

      mockUpdate.mockResolvedValue({
        id: "app-config",
        favicon: null,
      });

      const response = await DELETE();
      const data = await response.json();

      // Should still succeed even if file deletion fails
      expect(response.status).toBe(200);
      expect(data.favicon).toBeNull();
    });
  });
});
