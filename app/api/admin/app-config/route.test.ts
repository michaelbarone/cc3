/// <reference types="node" />
import { GET, PATCH } from "@/app/api/admin/app-config/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { createTestAdmin, createTestUser } from "@/app/lib/test/data/admin";
import { debugError, debugMockCalls, debugResponse } from "@/app/lib/test/debug";
import { PrismaClient } from "@prisma/client";
import type { MakeDirectoryOptions, PathLike } from "fs";
import fs from "fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeepMockProxy, mockDeep } from "vitest-mock-extended";

// Types for our test data
interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  loginTheme: "light" | "dark";
  registrationEnabled: boolean;
  favicon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RequestBody {
  appName?: string;
  loginTheme?: "light" | "dark";
  registrationEnabled?: boolean;
  appLogo?: string | null;
}

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Create Prisma mock
export type Context = {
  prisma: PrismaClient;
};

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

const prismaMock = mockDeep<PrismaClient>();

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("fs", () => ({
  default: {
    mkdir: vi.fn(
      (
        path: PathLike,
        options: MakeDirectoryOptions | ((error: Error | null) => void),
        callback?: (error: Error | null) => void,
      ) => {
        if (typeof options === "function") {
          options(null);
        } else if (callback) {
          callback(null);
        }
      },
    ),
    writeFile: vi.fn((path: PathLike, data: any, callback: (error: Error | null) => void) => {
      callback(null);
    }),
    unlink: vi.fn((path: PathLike, callback: (error: Error | null) => void) => {
      callback(null);
    }),
  },
}));

vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
  join: (...args: string[]) => args.join("/"),
}));

describe("App Configuration API", () => {
  const mockAdminToken = createTestAdmin();
  const mockNonAdminToken = createTestUser();
  const baseDate = new Date("2025-04-05T01:03:36.586Z");

  const mockConfig: AppConfig = {
    id: "app-config",
    appName: "Control Center",
    appLogo: null,
    loginTheme: "dark",
    registrationEnabled: false,
    favicon: null,
    createdAt: baseDate,
    updatedAt: baseDate,
  };

  const mockRequest = (body: RequestBody) =>
    new NextRequest("http://localhost/api/admin/app-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.resetAllMocks();
    console.time("test-execution");
  });

  afterEach(() => {
    console.timeEnd("test-execution");
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prismaMock.appConfig.findUnique), "appConfig.findUnique");
    debugMockCalls(vi.mocked(prismaMock.appConfig.create), "appConfig.create");
    debugMockCalls(vi.mocked(prismaMock.appConfig.update), "appConfig.update");
    debugMockCalls(vi.mocked(prismaMock.appConfig.upsert), "appConfig.upsert");
  });

  describe("GET /api/admin/app-config", () => {
    it("should return existing app configuration", async () => {
      // Mock the database response
      prismaMock.appConfig.findUnique.mockResolvedValue(mockConfig);

      // Make the request
      const response = await GET();
      const responseClone = response.clone();

      // Debug the clone
      await debugResponse(responseClone);

      // Then check status and parse body from original
      expect(response.status).toBe(200);
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      expect(data).toEqual(mockConfig);
    });

    it("should create and return default configuration when none exists", async () => {
      // Mock the database response
      prismaMock.appConfig.findUnique.mockResolvedValue(null);
      prismaMock.appConfig.create.mockResolvedValue(mockConfig);

      // Make the request
      const response = await GET();
      const responseClone = response.clone();

      // Debug the clone
      await debugResponse(responseClone);

      // Then check status and parse body from original
      expect(response.status).toBe(200);
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      expect(data).toEqual(mockConfig);
    });

    it("should handle database errors gracefully", async () => {
      // Mock the database error
      prismaMock.appConfig.findUnique.mockRejectedValue(new Error("Database error"));

      try {
        // Make the request
        const response = await GET();
        const responseClone = response.clone();

        // Debug the clone
        await debugResponse(responseClone);

        // Then check status and parse body from original
        expect(response.status).toBe(500);
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Error getting app config" });
      } catch (error) {
        debugError(error as Error, { findUnique: prismaMock.appConfig.findUnique.mock.calls });
        throw error;
      }
    });
  });

  describe("PATCH /api/admin/app-config", () => {
    it("rejects update when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null);

      const response = await PATCH(mockRequest({ appName: "New Name" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("rejects update when not admin", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockNonAdminToken);

      const response = await PATCH(mockRequest({ appName: "New Name" }));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Admin privileges required" });
    });

    it("validates app name is not empty", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(mockRequest({ appName: "" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "App name cannot be empty" });
    });

    it("validates app name is not whitespace", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(mockRequest({ appName: "   " }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "App name cannot be empty" });
    });

    it("handles database errors gracefully", async () => {
      // Mock authentication and database error
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      prismaMock.appConfig.update.mockRejectedValue(new Error("Database error"));

      try {
        // Make the request
        const response = await PATCH(mockRequest({ appName: "New Name" }));
        const responseClone = response.clone();

        // Debug the clone
        await debugResponse(responseClone);

        // Then check status and parse body from original
        expect(response.status).toBe(500);
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Error updating app config" });
      } catch (error) {
        debugError(error as Error, { update: prismaMock.appConfig.update.mock.calls });
        throw error;
      }
    });

    it("handles invalid JSON in request body", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/app-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid request body" });
    });

    it("handles logo upload when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, appLogo: "/logos/app-logo-123.webp" };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prismaMock.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const formData = new FormData();
      formData.append("logo", new Blob(["test"], { type: "image/webp" }), "test.webp");

      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/app-config", {
          method: "PATCH",
          body: formData,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appLogo).toMatch(/^\/logos\/app-logo-\d+\.webp$/);
    });

    it("deletes logo when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, appLogo: null };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prismaMock.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ appLogo: null }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appLogo).toBeNull();
    });

    it("updates login theme when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, loginTheme: "light" };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prismaMock.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ loginTheme: "light" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("light");
    });

    it("should handle invalid theme values", async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      // Make the request
      const response = await PATCH(mockRequest({ loginTheme: "invalid" as any }));
      const responseClone = response.clone();

      // Debug the clone
      await debugResponse(responseClone);

      // Then check status and parse body from original
      expect(response.status).toBe(400);
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      expect(data).toEqual({ error: "Invalid theme value" });
    });

    it("updates registration setting when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, registrationEnabled: true };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prismaMock.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ registrationEnabled: true }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.registrationEnabled).toBe(true);
    });

    it("should handle invalid registration enabled values", async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      // Make the request
      const response = await PATCH(mockRequest({ registrationEnabled: "invalid" as any }));
      const responseClone = response.clone();

      // Debug the clone
      await debugResponse(responseClone);

      // Then check status and parse body from original
      expect(response.status).toBe(400);
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      expect(data).toEqual({ error: "Invalid registration enabled value" });
    });

    it("handles file system errors during logo upload", async () => {
      // Mock authentication and file system error
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      const fsError = new Error("File system error");
      vi.spyOn(fs, "mkdir").mockImplementation(
        (
          path: PathLike,
          options: MakeDirectoryOptions | ((error: Error | null) => void),
          callback?: (error: Error | null) => void,
        ) => {
          if (typeof callback === "function") {
            callback(fsError);
          }
          return Promise.reject(fsError);
        },
      );

      try {
        // Make the request
        const response = await PATCH(mockRequest({ appLogo: "data:image/png;base64,abc123" }));
        const responseClone = response.clone();

        // Debug the clone
        await debugResponse(responseClone);

        // Then check status and parse body from original
        expect(response.status).toBe(500);
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        expect(data).toEqual({ error: "Error uploading logo" });
      } catch (error) {
        debugError(error as Error);
        throw error;
      }
    });

    it("returns 400 when no logo file provided in upload", async () => {
      const formData = new FormData();

      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/app-config", {
          method: "PATCH",
          body: formData,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No logo file provided" });
    });

    it("returns 400 when invalid file type provided in upload", async () => {
      const formData = new FormData();
      const invalidFile = new File(["content"], "file.txt", { type: "text/plain" });
      formData.append("logo", invalidFile);

      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/app-config", {
          method: "PATCH",
          body: formData,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid file type" });
    });

    it("updates app name when authenticated as admin", async () => {
      // Mock authentication and database response
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      prismaMock.appConfig.update.mockResolvedValue(mockConfig);

      // Make the request
      const response = await PATCH(mockRequest({ appName: "New App Name" }));
      const responseClone = response.clone();

      // Debug the clone
      await debugResponse(responseClone);

      // Then check status and parse body from original
      expect(response.status).toBe(200);
      const responseText = await response.text();
      const data = JSON.parse(responseText);

      expect(data).toMatchObject({
        id: "app-config",
        appName: "New App Name",
      });
    });
  });
});
