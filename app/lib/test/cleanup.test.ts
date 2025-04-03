import { PATCH as configPatch } from "@/app/api/admin/app-config/route";
import { POST as iconPost } from "@/app/api/admin/icons/route";
import { POST as avatarPost } from "@/app/api/user/avatar/route";
import type { JwtPayload } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import type { PathLike } from "fs";
import type { FileHandle } from "fs/promises";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { URL } from 'url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestMocks } from "./mocks";

// Mock all dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appConfig: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock sharp for success and failure cases
vi.mock("sharp", () => {
  return {
    default: vi.fn((buffer) => {
      if (process.env.MOCK_SHARP_FAIL === "true") {
        throw new Error("Processing failed");
      }
      return {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockImplementation(async (filepath) => {
          // Simulate file creation
          await fs.writeFile(filepath, Buffer.from("test"));
          return Promise.resolve();
        }),
      };
    }),
  };
});

// Mock fs/promises
vi.mock("fs/promises", () => {
  const createdFiles = new Set<string>();
  return {
    default: {
      writeFile: vi.fn(async (path: string) => {
        createdFiles.add(path);
        return Promise.resolve();
      }),
      unlink: vi.fn(async (path: string) => {
        createdFiles.delete(path);
        return Promise.resolve();
      }),
      mkdir: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockResolvedValue(undefined),
    },
    createdFiles,
  };
});

// Mock JWT verification
vi.mock("@/app/lib/auth/jwt", () => {
  return {
    verifyToken: vi.fn().mockResolvedValue({
      id: "test-user",
      username: "testuser",
      isAdmin: true,
    }),
  };
});

// Mock prisma
vi.mock("@/app/lib/db/prisma", () => {
  return {
    prisma: {
      user: {
        findMany: vi.fn().mockResolvedValue([{
          id: "test-user",
          username: "testuser",
          isAdmin: true,
          avatarUrl: "/avatars/old-avatar.webp",
          passwordHash: "hash",
          lastActiveUrl: "/",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          menuPosition: "left",
          themeMode: "light",
        }]),
        findUnique: vi.fn().mockResolvedValue({
          id: "test-user",
          username: "testuser",
          isAdmin: true,
          avatarUrl: "/avatars/old-avatar.webp",
          passwordHash: "hash",
          lastActiveUrl: "/",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          menuPosition: "left",
          themeMode: "light",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      appConfig: {
        findFirst: vi.fn().mockResolvedValue({
          id: "test-config",
          logoUrl: "/logos/old-logo.webp",
          iconUrl: "/icons/old-icon.webp",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

describe("File Operation Cleanup Tests", () => {
  const { cookieStore, prisma: mockPrisma, fs: mockFs } = setupTestMocks();

  // Track created files for cleanup verification
  const createdFiles = new Set<string>();

  // Common mock data
  const mockAdminJwtPayload: JwtPayload = {
    id: "admin-1",
    username: "admin",
    isAdmin: true,
  };

  beforeAll(() => {
    // Override fs.writeFile to track created files
    vi.mocked(fs.writeFile).mockImplementation((file: PathLike | FileHandle, data: any) => {
      if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
        createdFiles.add(file.toString());
      }
      return Promise.resolve();
    });

    // Override fs.unlink to remove files from tracking
    vi.mocked(fs.unlink).mockImplementation((file: PathLike) => {
      if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
        createdFiles.delete(file.toString());
      }
      return Promise.resolve();
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOCK_SHARP_FAIL = undefined;

    // Initialize old files in the createdFiles set
    const oldAvatarPath = path.join(process.cwd(), "public/avatars/old-avatar.webp");
    const oldIconPath = path.join(process.cwd(), "public/icons/old-icon.webp");
    const oldLogoPath = path.join(process.cwd(), "public/logos/old-logo.webp");

    createdFiles.add(oldAvatarPath);
    createdFiles.add(oldIconPath);
    createdFiles.add(oldLogoPath);
  });

  afterEach(() => {
    // Clear the createdFiles set
    createdFiles.clear();
  });

  describe("Avatar Operations", () => {
    const mockUser = {
      id: "user-1",
      username: "test",
      isAdmin: false,
      passwordHash: null,
      lastActiveUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      avatarUrl: "/avatars/test.webp",
      menuPosition: null,
      themeMode: null,
    };

    const mockJwtPayload = {
      id: mockUser.id,
      username: mockUser.username,
      isAdmin: mockUser.isAdmin,
    };

    it("cleans up old avatar when uploading new one", async () => {
      const oldAvatarPath = path.join(process.cwd(), "public/avatars/old-avatar.webp");
      const formData = new FormData();
      formData.append("avatar", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      const request = new NextRequest("http://localhost:3000/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      // Make the API call
      const response = await avatarPost(request);
      expect(response.status).toBe(200);

      // Verify old file is deleted
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(oldAvatarPath);
      expect(createdFiles.has(oldAvatarPath)).toBe(false);
    });

    it("cleans up temporary files on upload failure", async () => {
      process.env.MOCK_SHARP_FAIL = "true";
      const formData = new FormData();
      formData.append("avatar", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      const request = new NextRequest("http://localhost:3000/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      // Make the API call
      const response = await avatarPost(request);
      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);

      // Verify temp files are cleaned up
      const tempFiles = Array.from(createdFiles).filter((file) => file.includes("test.jpg"));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe("Icon Management", () => {
    it("cleans up old icon when uploading new one", async () => {
      const oldIconPath = path.join(process.cwd(), "public/icons/old-icon.webp");
      const formData = new FormData();
      formData.append("icon", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      // Make the API call
      const response = await iconPost(request);
      expect(response.status).toBe(200);

      // Verify old file is deleted
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(oldIconPath);
      expect(createdFiles.has(oldIconPath)).toBe(false);
    });

    it("cleans up temporary files on icon upload failure", async () => {
      process.env.MOCK_SHARP_FAIL = "true";
      const formData = new FormData();
      formData.append("icon", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      // Make the API call
      const response = await iconPost(request);
      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);

      // Verify temp files are cleaned up
      const tempFiles = Array.from(createdFiles).filter((file) => file.includes("test.jpg"));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe("App Configuration", () => {
    const mockAppConfig = {
      id: "config-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      appName: "Test App",
      appLogo: "/logos/old-logo.webp",
      favicon: null,
      loginTheme: "light",
      registrationEnabled: true,
    };

    it("cleans up old logo when uploading new one", async () => {
      const oldLogoPath = path.join(process.cwd(), "public/logos/old-logo.webp");
      const formData = new FormData();
      formData.append("logo", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      const request = new NextRequest("http://localhost:3000/api/admin/config", {
        method: "PATCH",
        body: formData,
      });

      // Make the API call
      const response = await configPatch(request);
      expect(response.status).toBe(200);

      // Verify old file is deleted
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(oldLogoPath);
      expect(createdFiles.has(oldLogoPath)).toBe(false);
    });
  });

  describe("First Run Operations", () => {
    const mockFirstRunUser = {
      id: "user-1",
      username: "admin",
      isAdmin: true,
      passwordHash: null,
      lastActiveUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      avatarUrl: null,
      menuPosition: null,
      themeMode: null,
    };

    it("cleans up temporary backup files after restore", async () => {
      // Setup first run state
      (prisma.user.findMany as any).mockResolvedValue([mockFirstRunUser]);

      // Simulate backup restore
      const mockFile = new File(["test"], "backup.zip", { type: "application/zip" });
      const formData = new FormData();
      formData.append("backup", mockFile);

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: formData,
      });

      // Verify temp files are cleaned up
      const tempFiles = Array.from(createdFiles);
      tempFiles.forEach(file => {
        expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(file);
        expect(createdFiles.has(file)).toBe(false);
      });
    });

    it("cleans up temporary files on restore failure", async () => {
      // Setup first run state with error
      (prisma.user.findMany as any).mockResolvedValue([mockFirstRunUser]);
      (fs.writeFile as any).mockRejectedValue(new Error("Write failed"));

      // Simulate backup restore
      const mockFile = new File(["test"], "backup.zip", { type: "application/zip" });
      const formData = new FormData();
      formData.append("backup", mockFile);

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: formData,
      });

      // Verify temp files are cleaned up
      const tempFiles = Array.from(createdFiles);
      tempFiles.forEach(file => {
        expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(file);
        expect(createdFiles.has(file)).toBe(false);
      });
    });
  });
});
