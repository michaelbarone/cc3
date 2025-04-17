/// <reference types="node" />
import { DELETE, GET, POST } from "@/app/api/admin/app-config/logo/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createMockAppConfig } from "@/test/fixtures/app-config";
import { createMockUser } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  const suiteTimer = measureTestTime("App Logo API Suite");
  const mockAdminUser = createMockUser({ isAdmin: true });
  const mockNonAdminUser = createMockUser({ isAdmin: false });
  const mockAppConfig = createMockAppConfig({
    appLogo: "/logos/test-logo.webp",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.appConfig.findUnique), "appConfig.findUnique");
    debugMockCalls(vi.mocked(prisma.appConfig.upsert), "appConfig.upsert");
    debugMockCalls(vi.mocked(prisma.appConfig.update), "appConfig.update");
    debugMockCalls(vi.mocked(fs.mkdir), "fs.mkdir");
    debugMockCalls(vi.mocked(fs.unlink), "fs.unlink");
    debugMockCalls(vi.mocked(sharp), "sharp");
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/app-config/logo", () => {
    it("should redirect to logo URL when logo exists", async () => {
      const testTimer = measureTestTime("logo redirect test");
      try {
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);

        // we do not need to debug this response as its a redirect
        const response = await GET();
        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toBe("http://localhost:3000/logos/test-logo.webp");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when no logo is set", async () => {
      const testTimer = measureTestTime("logo not found test");
      try {
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(
          createMockAppConfig({
            appLogo: null,
          }),
        );

        const response = await GET();
        const data = (await debugResponse(response)) as { error: string | null };

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "No logo found" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors", async () => {
      const testTimer = measureTestTime("logo database error test");
      try {
        const dbError = new Error("Database error");
        vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(dbError);

        const response = await GET();
        const data = (await debugResponse(response)) as { error: string | null };

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Error getting app logo" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
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
      const testTimer = measureTestTime("logo upload test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);
        vi.mocked(prisma.appConfig.upsert).mockResolvedValue(
          createMockAppConfig({
            appLogo: "/logos/app-logo-123.webp",
          }),
        );
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

        const response = await POST(request);
        const data = (await debugResponse(response)) as { appLogo: string | null };

        expect(response.status).toBe(200);
        expect(data.appLogo).toMatch(/^\/logos\/app-logo-\d+\.webp$/);
        expect(sharp).toHaveBeenCalled();
        expect(fs.mkdir).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
          upsert: vi.mocked(prisma.appConfig.upsert).mock.calls,
          mkdir: vi.mocked(fs.mkdir).mock.calls,
          sharp: vi.mocked(sharp).mock.calls,
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

    it("should return 401 when not authenticated", async () => {
      const testTimer = measureTestTime("unauthorized test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(null);

        const file = createImageFile();
        const formData = createFormData(file);
        const request = new NextRequest("http://localhost:3000", {
          method: "POST",
          body: formData,
        });

        const response = await POST(request);
        const data = (await debugResponse(response)) as { error: string | null };

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("forbidden test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(mockNonAdminUser);

        const file = createImageFile();
        const formData = createFormData(file);
        const request = new NextRequest("http://localhost:3000", {
          method: "POST",
          body: formData,
        });

        const response = await POST(request);
        const data = (await debugResponse(response)) as { error: string | null };

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Admin privileges required" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should return 400 when no file is provided", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

      const formData = createFormData();
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = (await debugResponse(response)) as { error: string | null };

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
      const data = (await debugResponse(response)) as { error: string | null };

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
      const data = (await debugResponse(response)) as { error: string | null };

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
        const data = (await debugResponse(response)) as { appLogo: string | null };

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
      const data = (await debugResponse(response)) as { error: string | null };

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 when authenticated as non-admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockNonAdminUser);

      const response = await DELETE();
      const data = (await debugResponse(response)) as { error: string | null };

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
      const data = (await debugResponse(response)) as { error: string | null };

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
      const data = (await debugResponse(response)) as { appLogo: string | null };

      expect(response.status).toBe(200);
      expect(data.appLogo).toBeNull();
    });
  });
});
