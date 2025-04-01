/// <reference types="node" />
import { GET, PATCH } from "@/app/api/admin/app-config/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import type { MakeDirectoryOptions, PathLike } from "fs";
import fs from "fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
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
}));

vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
  join: (...args: string[]) => args.join("/"),
}));

describe("App Configuration API", () => {
  const mockAdminToken = {
    id: "1",
    username: "admin",
    isAdmin: true,
  };

  const mockNonAdminToken = {
    id: "2",
    username: "user",
    isAdmin: false,
  };

  const mockConfig = {
    id: "app-config",
    appName: "Test App",
    appLogo: "/logos/test.webp",
    favicon: "/logos/favicon.ico",
    loginTheme: "dark",
    registrationEnabled: false,
    createdAt: "2025-03-30T18:35:46.633Z",
    updatedAt: "2025-03-30T18:35:46.633Z",
  };

  const defaultConfig = {
    id: "app-config",
    appName: "Control Center",
    appLogo: null,
    favicon: null,
    loginTheme: "dark",
    registrationEnabled: false,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.appConfig.upsert).mockImplementation(
      async (params: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
        ...mockConfig,
        ...params.update,
      }),
    );
  });

  const mockRequest = (body: any) =>
    new NextRequest("http://localhost/api/admin/app-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  describe("GET /api/admin/app-config", () => {
    it("should return existing app configuration", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce(mockConfig);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfig);
      expect(prisma.appConfig.findUnique).toHaveBeenCalledWith({
        where: { id: "app-config" },
      });
    });

    it("should create and return default configuration when none exists", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.appConfig.create).mockResolvedValueOnce(mockConfig);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfig);
      expect(prisma.appConfig.create).toHaveBeenCalledWith({
        data: {
          id: "app-config",
          appName: "Control Center",
          loginTheme: "dark",
          registrationEnabled: false,
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockRejectedValueOnce(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Error getting app config" });
    });
  });

  describe("PATCH /api/admin/app-config", () => {
    it("updates app name when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, appName: "New App Name" };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ appName: "New App Name" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedConfig);
    });

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
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prisma.appConfig.upsert).mockRejectedValueOnce(new Error("Database update failed"));

      const response = await PATCH(mockRequest({ appName: "New Name" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Error updating app config" });
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
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce(updatedConfig);

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
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ appLogo: null }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appLogo).toBeNull();
    });

    it("updates login theme when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, loginTheme: "light" };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ loginTheme: "light" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("light");
    });

    it("validates theme value", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(mockRequest({ loginTheme: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid theme value" });
    });

    it("updates registration setting when authenticated as admin", async () => {
      const updatedConfig = { ...mockConfig, registrationEnabled: true };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ registrationEnabled: true }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.registrationEnabled).toBe(true);
    });

    it("validates registration enabled value", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

      const response = await PATCH(mockRequest({ registrationEnabled: "true" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid registration enabled value" });
    });

    it("handles file system errors during logo upload", async () => {
      const formData = new FormData();
      const logoFile = new File(["logo content"], "logo.png", { type: "image/png" });
      formData.append("logo", logoFile);

      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      vi.mocked(fs.mkdir).mockImplementation(
        (
          path: PathLike,
          options: MakeDirectoryOptions | ((error: Error | null) => void),
          callback?: (error: Error | null) => void,
        ) => {
          if (typeof options === "function") {
            options(new Error("File system error"));
          } else if (callback) {
            callback(new Error("File system error"));
          }
        },
      );

      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/app-config", {
          method: "PATCH",
          body: formData,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Error uploading logo" });
    }, 10000);

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
  });
});
