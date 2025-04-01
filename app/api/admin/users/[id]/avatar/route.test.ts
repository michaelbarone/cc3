import { DELETE, POST } from "@/app/api/admin/users/[id]/avatar/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
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

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock("sharp", () => ({
  default: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock data
const mockAdminUser = {
  id: "admin-1",
  username: "admin",
  isAdmin: true,
};

const mockTargetUser = {
  id: "user-1",
  username: "testuser",
  avatarUrl: "/avatars/test.webp",
};

const mockContext = {
  params: Promise.resolve({ id: "user-1" }),
};

describe("Admin Avatar API", () => {
  const mockFile = new File(["test"], "test.png", { type: "image/png" });
  const mockFormData = new FormData();
  mockFormData.append("avatar", mockFile);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cookies
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "mock-token" }),
    } as any);

    // Mock sharp operations
    const mockSharp = {
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(sharp).mockReturnValue(mockSharp as any);

    // Mock fs operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
  });

  describe("POST /api/admin/users/[id]/avatar", () => {
    it("allows admin to upload avatar for another user", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockTargetUser,
        avatarUrl: "/avatars/user-1-123456789.webp",
      });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.avatarUrl).toMatch(/^\/avatars\/user-1-\d+\.webp$/);
    });

    it("rejects unauthorized requests", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request, mockContext);
      expect(response.status).toBe(401);
    });

    it("rejects non-admin users", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request, mockContext);
      expect(response.status).toBe(403);
    });

    it("handles non-existent user", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request, mockContext);
      expect(response.status).toBe(404);
    });

    it("validates file size", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

      const largeFile = new File(["test".repeat(1000000)], "large.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("avatar", largeFile);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, mockContext);
      expect(response.status).toBe(400);
    });

    it("validates file type", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

      const invalidFile = new File(["test"], "test.txt", { type: "text/plain" });
      const formData = new FormData();
      formData.append("avatar", invalidFile);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, mockContext);
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/admin/users/[id]/avatar", () => {
    it("allows admin to delete another user's avatar", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockTargetUser,
        avatarUrl: null,
      });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ success: true });
    });

    it("rejects unauthorized requests", async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(401);
    });

    it("rejects non-admin users", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(403);
    });

    it("handles non-existent user", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(404);
    });

    it("handles missing avatar", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        ...mockTargetUser,
        avatarUrl: null,
      });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(400);
    });

    it("handles file system errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockTargetUser,
        avatarUrl: null,
      });

      const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockContext);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ success: true });
    });
  });
});
