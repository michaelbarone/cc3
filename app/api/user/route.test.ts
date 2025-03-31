import { DELETE as deleteAvatar, POST as uploadAvatar } from "@/app/api/user/avatar/route";
import { GET as getPreferences, POST as updatePreferences } from "@/app/api/user/preferences/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", async () => ({
  default: {
    mkdir: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
  },
  mkdir: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("path", async (importOriginal) => {
  const mockJoin = vi.fn((...args) => args.join("/"));
  const actual = (await importOriginal()) as typeof path;
  return {
    default: {
      ...actual,
      join: mockJoin,
    },
    join: mockJoin,
  };
});

describe("User API", () => {
  const mockDate = new Date("2024-01-01T00:00:00.000Z");
  const mockUser = {
    id: "1",
    username: "testuser",
    passwordHash: null,
    isAdmin: false,
    menuPosition: "top" as const,
    themeMode: "dark" as const,
    avatarUrl: null,
    lastActiveUrl: null,
    lastLoginAt: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockJwtPayload = {
    id: mockUser.id,
    isAdmin: mockUser.isAdmin,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock path.join to return predictable paths
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
  });

  describe("User Preferences", () => {
    describe("GET /api/user/preferences", () => {
      it("returns user preferences when authenticated", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const response = await getPreferences();
        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({
          preferences: {
            menuPosition: "top",
            themeMode: "dark",
          },
          rawPreferences: {
            ...mockUser,
            createdAt: mockDate.toISOString(),
            updatedAt: mockDate.toISOString(),
          },
        });
      });

      it("returns 401 when not authenticated", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(null);

        const response = await getPreferences();
        expect(response.status).toBe(401);
      });

      it("returns 404 when user not found", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const response = await getPreferences();
        expect(response.status).toBe(404);
      });
    });

    describe("POST /api/user/preferences", () => {
      it("updates menu position when valid", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockUser,
          menuPosition: "side",
        });

        const request = new NextRequest("http://localhost/api/user/preferences", {
          method: "POST",
          body: JSON.stringify({ menuPosition: "side" }),
        });

        const response = await updatePreferences(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.preferences.menuPosition).toBe("side");
      });

      it("updates theme mode when valid", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockUser,
          themeMode: "light",
        });

        const request = new NextRequest("http://localhost/api/user/preferences", {
          method: "POST",
          body: JSON.stringify({ themeMode: "light" }),
        });

        const response = await updatePreferences(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.preferences.themeMode).toBe("light");
      });

      it("validates menu position values", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const request = new NextRequest("http://localhost/api/user/preferences", {
          method: "POST",
          body: JSON.stringify({ menuPosition: "invalid" }),
        });

        const response = await updatePreferences(request);
        expect(response.status).toBe(400);
      });

      it("validates theme mode values", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const request = new NextRequest("http://localhost/api/user/preferences", {
          method: "POST",
          body: JSON.stringify({ themeMode: "invalid" }),
        });

        const response = await updatePreferences(request);
        expect(response.status).toBe(400);
      });
    });
  });

  describe("User Avatar", () => {
    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const mockFormData = new FormData();
    mockFormData.append("avatar", mockFile);

    beforeEach(() => {
      // Mock sharp operations
      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(sharp).mockReturnValue(mockSharp as any);
    });

    describe("POST /api/user/avatar", () => {
      it("uploads avatar when authenticated", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: mockFormData,
        });

        const response = await uploadAvatar(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.avatarUrl).toMatch(/^\/avatars\/1-\d+\.webp$/);
      });

      it("handles file size limit", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const largeFile = new File(["test".repeat(1000000)], "large.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("avatar", largeFile);

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        const response = await uploadAvatar(request);
        expect(response.status).toBe(400);
      });

      it("validates file type", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const invalidFile = new File(["test"], "test.txt", { type: "text/plain" });
        const formData = new FormData();
        formData.append("avatar", invalidFile);

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        const response = await uploadAvatar(request);
        expect(response.status).toBe(400);
      });
    });

    describe("DELETE /api/user/avatar", () => {
      it("deletes avatar when authenticated", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: "/avatars/test.webp",
        });
        vi.mocked(fs.access).mockResolvedValueOnce(undefined);
        vi.mocked(fs.unlink).mockResolvedValueOnce(undefined);
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: null,
        });

        const response = await deleteAvatar();
        expect(response.status).toBe(200);
      });

      it("handles missing avatar", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: "/avatars/test.webp",
        });
        vi.mocked(fs.access).mockRejectedValueOnce(new Error("File not found"));
        vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File not found"));

        const response = await deleteAvatar();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({ success: true });
      });

      it("handles file system errors gracefully", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: "/avatars/test.webp",
        });
        vi.mocked(fs.access).mockResolvedValueOnce(undefined);
        vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));

        const response = await deleteAvatar();
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({ success: true });
      });
    });
  });
});
