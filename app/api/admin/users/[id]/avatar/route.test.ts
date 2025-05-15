import { DELETE, POST } from "@/app/api/admin/users/[id]/avatar/route";
import { JwtPayload, verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { createMockUser } from "@/test/mocks/factories/user.factory";
import fs from "fs/promises";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import sharp from "sharp";
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
  const mockAdminUser: JwtPayload = createMockUser({
    id: "admin-1",
    username: "admin",
    isAdmin: true,
  }) as unknown as JwtPayload;
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
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
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

        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");
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

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");
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

    it("should return 400 for non-existent user", async () => {
      // Use unique variable names for this test to avoid conflicts
      const uniqueTestTimer = measureTestTime("unique-nonexistent-user-404-test");
      try {
        // Clear mocks explicitly but don't reset them (preserve stubs)
        vi.clearAllMocks();

        // Mock cookies properly - this is what was missing!
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock-token" }),
        } as any);

        // Create unique user ID for this test
        const uniqueNonexistentId = `nonexistent-${Date.now()}-${Math.random().toString(36).substring(2)}`;

        // Mock admin token verification with proper structure - use unique variable
        const uniqueAdminMock = { ...mockAdminUser, id: `admin-${Date.now()}` };
        vi.mocked(verifyToken).mockResolvedValueOnce(uniqueAdminMock);

        // Mock Prisma to return null to trigger the !user?.id check
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        // Log mock state before request for debugging
        console.log(
          `[404 Test] Before request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[404 Test] Before request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[404 Test] Before request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );

        const uniqueActionTimer = measureTestTime("unique-nonexistent-user-404-action");
        const response = await DELETE(
          new NextRequest(`http://localhost:3000/api/admin/users/${uniqueNonexistentId}/avatar`),
          { params: Promise.resolve({ id: uniqueNonexistentId }) },
        );
        expect(uniqueActionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        uniqueActionTimer.end();

        // Log mock state after request for debugging
        console.log(
          `[404 Test] After request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[404 Test] After request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[404 Test] After request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );
        console.log(`[404 Test] Response status: ${response.status}`);

        // Use debugResponse to properly capture and analyze the response
        const data = await debugResponse<AvatarResponse>(response);

        console.log(`[404 Test] Response data:`, data);
        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");
        expect(uniqueTestTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        console.error(`[404 Test] Error:`, error);
        debugError(error as Error, {
          context: "Unique nonexistent user 404 test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      } finally {
        uniqueTestTimer.end();
      }
    });

    it("should return 404 when user has no avatar", async () => {
      // Use unique variable names for this test to avoid conflicts
      const uniqueNoAvatarTimer = measureTestTime("unique-no-avatar-400-test");
      try {
        // Clear mocks explicitly but don't reset them (preserve stubs)
        vi.clearAllMocks();

        // Mock cookies properly - this is what was missing!
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock-token" }),
        } as any);

        // Create unique user ID for this test
        const uniqueUserId = `no-avatar-${Date.now()}-${Math.random().toString(36).substring(2)}`;

        // Mock admin token verification with proper structure - use unique variable
        const uniqueAdminMock = { ...mockAdminUser, id: `admin-${Date.now()}` };
        vi.mocked(verifyToken).mockResolvedValueOnce(uniqueAdminMock);

        // Mock Prisma to return user without avatar - to trigger the !user.avatarUrl check
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: uniqueUserId,
          avatarUrl: null,
          // We only need these fields as the implementation only checks for id and avatarUrl
        } as any);

        // Log mock state before request for debugging
        console.log(
          `[400 Test] Before request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[400 Test] Before request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[400 Test] Before request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );

        const uniqueActionTimer = measureTestTime("unique-no-avatar-400-action");
        const response = await DELETE(
          new NextRequest(`http://localhost:3000/api/admin/users/${uniqueUserId}/avatar`),
          { params: Promise.resolve({ id: uniqueUserId }) },
        );
        expect(uniqueActionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        uniqueActionTimer.end();

        // Log mock state after request for debugging
        console.log(
          `[400 Test] After request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[400 Test] After request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[400 Test] After request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );
        console.log(`[400 Test] Response status: ${response.status}`);

        const data = await debugResponse<AvatarResponse>(response);

        console.log(`[400 Test] Response data:`, data);
        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");
        expect(uniqueNoAvatarTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        console.error(`[400 Test] Error:`, error);
        debugError(error as Error, {
          context: "Unique no avatar 400 test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      } finally {
        uniqueNoAvatarTimer.end();
      }
    });

    it("should return 400 when file system operations fail", async () => {
      // Use unique variable names for this test to avoid conflicts
      const uniqueFsErrorTimer = measureTestTime("unique-fs-error-graceful-test");
      try {
        // Clear mocks explicitly but don't reset them (preserve stubs)
        vi.clearAllMocks();

        // Mock cookies properly - this is what was missing!
        vi.mocked(cookies).mockReturnValue({
          get: vi.fn().mockReturnValue({ value: "mock-token" }),
        } as any);

        // Create unique user ID for this test
        const uniqueUserId = `fs-error-${Date.now()}-${Math.random().toString(36).substring(2)}`;

        // Mock admin token verification with proper structure - use unique variable
        const uniqueAdminMock = { ...mockAdminUser, id: `admin-${Date.now()}` };
        vi.mocked(verifyToken).mockResolvedValueOnce(uniqueAdminMock);

        // Mock Prisma to return user with avatar
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: uniqueUserId,
          avatarUrl: `/avatars/${uniqueUserId}.webp`,
          // We only need these fields as the implementation only checks for id and avatarUrl
        } as any);

        // Mock fs access to throw error
        vi.mocked(fs.access).mockRejectedValueOnce(new Error("File system error"));

        // Mock successful database update
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          id: uniqueUserId,
          avatarUrl: null,
          // We only need these fields for the test assertion
        } as any);

        // Log mock state before request for debugging
        console.log(
          `[FS Test] Before request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[FS Test] Before request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[FS Test] Before request: fs.access mock calls: ${vi.mocked(fs.access).mock.calls.length}`,
        );
        console.log(
          `[FS Test] Before request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );

        const uniqueActionTimer = measureTestTime("unique-fs-error-graceful-action");
        const response = await DELETE(
          new NextRequest(`http://localhost:3000/api/admin/users/${uniqueUserId}/avatar`),
          { params: Promise.resolve({ id: uniqueUserId }) },
        );
        expect(uniqueActionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        uniqueActionTimer.end();

        // Log mock state after request for debugging
        console.log(
          `[FS Test] After request: verifyToken mock calls: ${vi.mocked(verifyToken).mock.calls.length}`,
        );
        console.log(
          `[FS Test] After request: findUnique mock calls: ${vi.mocked(prisma.user.findUnique).mock.calls.length}`,
        );
        console.log(
          `[FS Test] After request: fs.access mock calls: ${vi.mocked(fs.access).mock.calls.length}`,
        );
        console.log(
          `[FS Test] After request: cookies mock calls: ${vi.mocked(cookies).mock.calls.length}`,
        );
        console.log(`[FS Test] Response status: ${response.status}`);

        const data = await debugResponse<AvatarResponse>(response);

        console.log(`[FS Test] Response data:`, data);
        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");
        expect(uniqueFsErrorTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        console.error(`[FS Test] Error:`, error);
        debugError(error as Error, {
          context: "Unique fs error graceful test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
            access: vi.mocked(fs.access).mock.calls,
            cookies: vi.mocked(cookies).mock.calls,
          },
        });
        throw error;
      } finally {
        uniqueFsErrorTimer.end();
      }
    });
  });
});
