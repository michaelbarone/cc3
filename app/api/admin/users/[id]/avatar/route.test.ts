import { DELETE, POST } from "@/app/api/admin/users/[id]/avatar/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { createMockUser } from "@/test/mocks/factories/user.factory";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import sharp from "sharp";
import type { Mock } from "vitest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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

// Response type for type safety
interface AvatarResponse {
  avatarUrl?: string;
  error?: string;
  success?: boolean;
}

// Helper function to create test files
const createTestFileBlob = (content = "test", name = "test.png", type = "image/png"): File => {
  return new File([content], name, { type });
};

describe("Admin Avatar API", () => {
  const mockAdminUser = createMockUser({ id: "admin-1", username: "admin", isAdmin: true });
  const mockTargetUser = createMockUser({ id: "user-1", username: "testuser" });
  const mockFile = createTestFileBlob();
  const mockFormData = new FormData();
  mockFormData.append("avatar", mockFile);
  const mockContext = { params: Promise.resolve({ id: "user-1" }) };
  const suiteTimer = measureTestTime("Admin Avatar API Suite");

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

  afterAll(() => {
    suiteTimer.end();
  });

  describe("POST /api/admin/users/[id]/avatar", () => {
    it("allows admin to upload avatar for another user", async () => {
      const testTimer = measureTestTime("admin-upload-avatar-test");
      try {
        // Arrange
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

        // Act
        const actionTimer = measureTestTime("upload-avatar-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.avatarUrl).toMatch(/^\/avatars\/user-1-\d+\.webp$/);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          context: "Admin avatar upload test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("rejects unauthorized requests", async () => {
      const testTimer = measureTestTime("unauth-upload-avatar-test");
      try {
        // Arrange
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        } as any);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        // Act
        const actionTimer = measureTestTime("unauth-upload-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Unauthorized avatar upload test",
          mockState: {
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("rejects non-admin users", async () => {
      const testTimer = measureTestTime("non-admin-upload-avatar-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        // Act
        const actionTimer = measureTestTime("non-admin-upload-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Non-admin avatar upload test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles non-existent user", async () => {
      const testTimer = measureTestTime("nonexistent-user-upload-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: mockFormData,
        });

        // Act
        const actionTimer = measureTestTime("nonexistent-user-upload-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Nonexistent user upload test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("validates file size", async () => {
      const testTimer = measureTestTime("file-size-validation-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

        const largeFile = createTestFileBlob("test".repeat(1000000));
        const formData = new FormData();
        formData.append("avatar", largeFile);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: formData,
        });

        // Act
        const actionTimer = measureTestTime("file-size-validation-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("File too large (max 2MB)");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "File size validation test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("validates file type", async () => {
      const testTimer = measureTestTime("file-type-validation-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

        const invalidFile = createTestFileBlob("test.txt", "test.txt", "text/plain");
        const formData = new FormData();
        formData.append("avatar", invalidFile);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "POST",
          body: formData,
        });

        // Act
        const actionTimer = measureTestTime("file-type-validation-action");
        const response = await POST(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("File must be an image");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "File type validation test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/users/[id]/avatar", () => {
    it("allows admin to delete another user's avatar", async () => {
      const testTimer = measureTestTime("admin-delete-avatar-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: "/avatars/user-1.webp",
        });
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: null,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        // Act
        const actionTimer = measureTestTime("delete-avatar-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Admin avatar deletion test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("rejects unauthorized requests", async () => {
      const testTimer = measureTestTime("unauth-delete-avatar-test");
      try {
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue(undefined),
        } as any);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const actionTimer = measureTestTime("unauth-delete-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Unauthorized delete avatar test",
          mockState: {
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("rejects non-admin users", async () => {
      const testTimer = measureTestTime("non-admin-delete-avatar-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce({ ...mockAdminUser, isAdmin: false });
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockTargetUser);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const actionTimer = measureTestTime("non-admin-delete-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Non-admin delete avatar test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles non-existent user", async () => {
      const testTimer = measureTestTime("nonexistent-user-delete-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const actionTimer = measureTestTime("nonexistent-user-delete-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Nonexistent user delete avatar test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles missing avatar", async () => {
      const testTimer = measureTestTime("missing-avatar-delete-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: null,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const actionTimer = measureTestTime("missing-avatar-delete-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Missing avatar delete test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime("fs-error-delete-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminUser);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: "/avatars/user-1.webp",
        });
        vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockTargetUser,
          avatarUrl: null,
        });

        const request = new NextRequest("http://localhost/api/admin/users/user-1/avatar", {
          method: "DELETE",
        });

        const actionTimer = measureTestTime("fs-error-delete-action");
        const response = await DELETE(request, mockContext);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "File system error delete test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            unlink: vi.mocked(fs.unlink).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user does not exist", async () => {
      // Mock admin token verification
      (verifyToken as Mock).mockResolvedValue({ isAdmin: true });

      // Mock Prisma to return null (user not found)
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/admin/users/nonexistent/avatar"),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });

    it("should return 400 when user has no avatar", async () => {
      // Mock admin token verification
      (verifyToken as Mock).mockResolvedValue({ isAdmin: true });

      // Mock Prisma to return user without avatar
      (prisma.user.findUnique as Mock).mockResolvedValue({
        id: "test-user",
        avatarUrl: null,
      });

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/admin/users/test-user/avatar"),
        { params: Promise.resolve({ id: "test-user" }) },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("User does not have an avatar");
    });

    it("should handle file system errors gracefully", async () => {
      // Mock admin token verification
      (verifyToken as Mock).mockResolvedValue({ isAdmin: true });

      // Mock Prisma to return user with avatar
      (prisma.user.findUnique as Mock).mockResolvedValue({
        id: "test-user",
        avatarUrl: "/avatars/test.webp",
      });

      // Mock fs access to throw error
      (fs.access as Mock).mockRejectedValue(new Error("File system error"));

      // Mock successful database update
      (prisma.user.update as Mock).mockResolvedValue({
        id: "test-user",
        avatarUrl: null,
      });

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/admin/users/test-user/avatar"),
        { params: Promise.resolve({ id: "test-user" }) },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
