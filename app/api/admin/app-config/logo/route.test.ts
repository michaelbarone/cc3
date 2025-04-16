/// <reference types="node" />
import { DELETE, GET, POST } from "@/app/api/admin/app-config/logo/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugMockCalls, debugResponse } from "@/test/helpers/debug";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock fs/promises with proper default export
vi.mock("fs/promises", async () => {
  const mockFunctions = {
    mkdir: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
  };
  return {
    default: mockFunctions,
    ...mockFunctions,
  };
});

// Mock sharp with proper file processing simulation
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  }));
  return {
    default: mockSharp,
  };
});

// Mock path.join to return predictable paths
vi.mock("path", async () => {
  const mockJoin = vi.fn((...args) => args.join("/"));
  return {
    default: {
      join: mockJoin,
    },
    join: mockJoin,
  };
});

describe("App Logo API", () => {
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

  const mockAppConfig = {
    id: "app-config",
    appName: "Test App",
    appLogo: "/logos/test-logo.webp",
    favicon: null,
    loginTheme: "dark",
    registrationEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    console.time("test-execution");
  });

  afterEach(() => {
    console.timeEnd("test-execution");
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.appConfig.findUnique), "appConfig.findUnique");
    debugMockCalls(vi.mocked(prisma.appConfig.upsert), "appConfig.upsert");
    debugMockCalls(vi.mocked(prisma.appConfig.update), "appConfig.update");
    debugMockCalls(vi.mocked(fs.mkdir), "fs.mkdir");
    debugMockCalls(vi.mocked(fs.unlink), "fs.unlink");
    debugMockCalls(vi.mocked(sharp), "sharp");
  });

  describe("GET /api/admin/app-config/logo", () => {
    it("should redirect to logo URL when logo exists", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);

      const response = await GET();
      const data = await response.json().catch(() => null);
      // await debugResponse(response.clone());

      expect(data.status).toBe(307);
      expect(data.headers.get("Location")).toBe("http://localhost:3000/logos/test-logo.webp");
    });

    it("should return 404 when no logo is set", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        ...mockAppConfig,
        appLogo: null,
      });

      const response = await GET();
      const data = await response.json();
      await debugResponse(response);

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "No logo found" });
    });

    it("should handle database errors", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(new Error("Database error"));

      try {
        const response = await GET();
        const data = await response.json();
        await debugResponse(response.clone());

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Error getting app logo" });
      } catch (error) {
        debugError(error as Error, {
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
        });
        throw error;
      }
    });
  });

  describe("POST /api/admin/app-config/logo", () => {
    const createFormData = (file?: File) => {
      const formData = new FormData();
      if (file) {
        formData.append("logo", file);
      }
      return formData;
    };

    const createImageFile = (size = 500 * 1024) => {
      return new File([new ArrayBuffer(size)], "test-logo.png", { type: "image/png" });
    };

    it("should upload and process logo when authenticated as admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);
      vi.mocked(prisma.appConfig.upsert).mockResolvedValue({
        ...mockAppConfig,
        appLogo: "/logos/app-logo-123.webp",
      });
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(sharp).mockReturnValue({
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      const file = createImageFile();
      const formData = createFormData(file);
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      try {
        const response = await POST(request);
        const data = await response.json();
        await debugResponse(response.clone());

        expect(response.status).toBe(200);
        expect(data.appLogo).toMatch(/^\/logos\/app-logo-\d+\.webp$/);
        expect(sharp).toHaveBeenCalled();
        expect(fs.mkdir).toHaveBeenCalled();
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
          upsert: vi.mocked(prisma.appConfig.upsert).mock.calls,
          mkdir: vi.mocked(fs.mkdir).mock.calls,
          sharp: vi.mocked(sharp).mock.calls,
        });
        throw error;
      }
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const file = createImageFile();
      const formData = createFormData(file);
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();
      await debugResponse(response.clone());

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockNonAdminUser);

      const file = createImageFile();
      const formData = createFormData(file);
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Admin privileges required" });
    });

    it("should return 400 when no file is provided", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

      const formData = createFormData();
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No logo file provided" });
    });

    it("should return 400 when file is too large", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

      const file = createImageFile(2 * 1024 * 1024); // 2MB
      const formData = createFormData(file);
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "File too large (max 1MB)" });
    });

    it("should return 400 when file is not an image", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const formData = createFormData(file);
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "File must be an image" });
    });
  });

  describe("DELETE /api/admin/app-config/logo", () => {
    it("should delete logo when authenticated as admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);
      vi.mocked(prisma.appConfig.update).mockResolvedValue({
        ...mockAppConfig,
        appLogo: null,
      });
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      try {
        const response = await DELETE();
        const data = await response.json();
        await debugResponse(response.clone());

        expect(response.status).toBe(200);
        expect(data.appLogo).toBeNull();
        expect(fs.unlink).toHaveBeenCalled();
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
          update: vi.mocked(prisma.appConfig.update).mock.calls,
          access: vi.mocked(fs.access).mock.calls,
          unlink: vi.mocked(fs.unlink).mock.calls,
        });
        throw error;
      }
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();
      await debugResponse(response.clone());

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockNonAdminUser);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Admin privileges required" });
    });

    it("should return 400 when no logo exists", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        ...mockAppConfig,
        appLogo: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "App does not have a logo" });
    });

    it("should handle file deletion errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockRejectedValue(new Error("File deletion error"));
      vi.mocked(prisma.appConfig.update).mockResolvedValue({
        ...mockAppConfig,
        appLogo: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appLogo).toBeNull();
    });
  });
});
