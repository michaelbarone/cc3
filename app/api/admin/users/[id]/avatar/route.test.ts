import { DELETE, POST } from "@/app/api/admin/users/[id]/avatar/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createTestTimer, debugResponse } from "@/test/utils/helpers/debug";
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

// Factory functions for test data
const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  username: "testuser",
  isAdmin: false,
  passwordHash: "hashed_password",
  lastActiveUrl: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  lastLoginAt: null,
  avatarUrl: "/avatars/test.webp",
  menuPosition: null,
  themeMode: null,
  ...overrides,
});

const createMockFile = (overrides = {}) => {
  const defaults = {
    content: "test",
    name: "test.png",
    type: "image/png",
  };
  const config = { ...defaults, ...overrides };
  return new File([config.content], config.name, { type: config.type });
};

describe("Admin Avatar API", () => {
  const mockAdminUser = createMockUser({ id: "admin-1", username: "admin", isAdmin: true });
  const mockTargetUser = createMockUser({ id: "user-1", username: "testuser" });
  const mockFile = createMockFile();
  const mockFormData = new FormData();
  mockFormData.append("avatar", mockFile);
  const mockContext = { params: Promise.resolve({ id: "user-1" }) };
  const timer = createTestTimer();

  beforeEach(() => {
    vi.clearAllMocks();
    timer.reset();

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
      timer.start("admin-upload-avatar-test");
      try {
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
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.avatarUrl).toMatch(/^\/avatars\/user-1-\d+\.webp$/);

        timer.end("admin-upload-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      }
    });

    it("rejects unauthorized requests", async () => {
      timer.start("unauth-upload-avatar-test");
      try {
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        } as any);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");

        timer.end("unauth-upload-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      }
    });

    it("rejects non-admin users", async () => {
      timer.start("non-admin-upload-avatar-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");

        timer.end("non-admin-upload-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      }
    });

    it("handles non-existent user", async () => {
      timer.start("nonexistent-user-upload-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        timer.end("nonexistent-user-upload-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });

    it("validates file size", async () => {
      timer.start("file-size-validation-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

        const largeFile = createMockFile({
          content: "test".repeat(1000000),
          name: "large.png",
        });
        const formData = new FormData();
        formData.append("avatar", largeFile);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: formData,
        });

        const response = await POST(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("File too large (max 2MB)");

        timer.end("file-size-validation-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });

    it("validates file type", async () => {
      timer.start("file-type-validation-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

        const invalidFile = createMockFile({
          name: "test.txt",
          type: "text/plain",
        });
        const formData = new FormData();
        formData.append("avatar", invalidFile);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: formData,
        });

        const response = await POST(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("File must be an image");

        timer.end("file-type-validation-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });
  });

  describe("DELETE /api/admin/users/[id]/avatar", () => {
    it("allows admin to delete another user's avatar", async () => {
      timer.start("admin-delete-avatar-test");
      try {
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
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });

        timer.end("admin-delete-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      }
    });

    it("rejects unauthorized requests", async () => {
      timer.start("unauth-delete-avatar-test");
      try {
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        } as any);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const response = await DELETE(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");

        timer.end("unauth-delete-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      }
    });

    it("rejects non-admin users", async () => {
      timer.start("non-admin-delete-avatar-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const response = await DELETE(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");

        timer.end("non-admin-delete-avatar-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      }
    });

    it("handles non-existent user", async () => {
      timer.start("nonexistent-user-delete-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const response = await DELETE(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        timer.end("nonexistent-user-delete-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });

    it("handles missing avatar", async () => {
      timer.start("missing-avatar-delete-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: null,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const response = await DELETE(request, mockContext);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");

        timer.end("missing-avatar-delete-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });

    it("handles file system errors gracefully", async () => {
      timer.start("fs-error-delete-test");
      try {
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
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });

        timer.end("fs-error-delete-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            unlink: vi.mocked(fs.unlink).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      }
    });
  });
});
