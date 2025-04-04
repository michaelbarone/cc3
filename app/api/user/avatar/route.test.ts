import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";

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

// Mock data
const mockUser = {
  id: "user-1",
  username: "testuser",
  isAdmin: false,
  avatarUrl: "/avatars/test.webp",
};

describe("User Avatar API", () => {
  const mockFile = new File(["test"], "test.png", { type: "image/png" });
  const mockFormData = new FormData();
  mockFormData.append("avatar", mockFile);

  beforeEach(() => {
    vi.clearAllMocks();

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

  describe("POST /api/user/avatar", () => {
    it("allows user to upload their avatar", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: "/avatars/user-1-123456789.webp",
      });

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.avatarUrl).toMatch(/^\/avatars\/user-1-\d+\.webp$/);
    });

    it("rejects unauthorized requests", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles non-existent user", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("validates file size", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const largeFile = new File(["test".repeat(1000000)], "large.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("avatar", largeFile);

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "File too large (max 2MB)" });
    });

    it("validates file type", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const invalidFile = new File(["test"], "test.txt", { type: "text/plain" });
      const formData = new FormData();
      formData.append("avatar", invalidFile);

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "File must be an image" });
    });

    it("handles missing file", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const formData = new FormData();

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No avatar file provided" });
    });

    it("handles internal server errors", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: mockFormData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Error uploading avatar" });
    });
  });

  describe("DELETE /api/user/avatar", () => {
    it("allows user to delete their avatar", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it("rejects unauthorized requests", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("handles non-existent user", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("handles missing avatar", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "User does not have an avatar" });
    });

    it("handles file system errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it("handles internal server errors", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("Database error"));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Error deleting avatar" });
    });
  });
});
