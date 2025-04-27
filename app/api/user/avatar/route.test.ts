import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { createTestFileBlob } from "@/test/mocks/factories/file.factory";
import { createMockUser } from "@/test/mocks/factories/user.factory";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";

// Types
interface AvatarResponse {
  success?: boolean;
  avatarUrl?: string;
  error?: string;
}

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

describe("User Avatar API", () => {
  const suiteTimer = measureTestTime("User Avatar API Suite");
  const mockUser = createMockUser();
  const mockFile = createTestFileBlob();
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

  afterEach(() => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.user.findUnique), "user.findUnique");
    debugMockCalls(vi.mocked(prisma.user.update), "user.update");
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("POST /api/user/avatar", () => {
    it("allows user to upload their avatar", async () => {
      const testTimer = measureTestTime("upload-avatar-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: `/avatars/${mockUser.id}-123456789.webp`,
        });

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: mockFormData,
        });

        // Act
        const actionTimer = measureTestTime("upload-avatar-action");
        const response = await POST(request);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.avatarUrl).toMatch(new RegExp(`^/avatars/${mockUser.id}-\\d+\\.webp$`));
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          context: "Upload avatar test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
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

    it("rejects unauthorized requests", async () => {
      const testTimer = measureTestTime("unauth-upload-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce(null);

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: mockFormData,
        });

        // Act
        const actionTimer = measureTestTime("unauth-upload-action");
        const response = await POST(request);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Unauthorized upload test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.UNIT,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles non-existent user", async () => {
      const testTimer = measureTestTime("nonexistent-user-test");
      try {
        // Arrange
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

        // Act
        const actionTimer = measureTestTime("nonexistent-user-action");
        const response = await POST(request);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Nonexistent user test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.UNIT,
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
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

        const invalidFile = createTestFileBlob("test.txt", "text/plain");
        const formData = new FormData();
        formData.append("avatar", invalidFile);

        const request = new NextRequest("http://localhost/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        // Act
        const actionTimer = measureTestTime("file-type-validation-action");
        const response = await POST(request);
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
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.UNIT,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles missing file", async () => {
      const testTimer = measureTestTime("missing-file-test");
      try {
        // Arrange
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

        // Act
        const actionTimer = measureTestTime("missing-file-action");
        const response = await POST(request);
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("No avatar file provided");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Missing file test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.UNIT,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/user/avatar", () => {
    it("allows user to delete their avatar", async () => {
      const testTimer = measureTestTime("delete-avatar-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const userWithAvatar = {
          ...mockUser,
          avatarUrl: `/avatars/${mockUser.id}-123456789.webp`,
        };

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userWithAvatar);
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...userWithAvatar,
          avatarUrl: null,
        });

        // Act
        const actionTimer = measureTestTime("delete-avatar-action");
        const response = await DELETE();
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          context: "Delete avatar test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
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

    it("handles missing avatar", async () => {
      const testTimer = measureTestTime("missing-avatar-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: null,
        });

        // Act
        const actionTimer = measureTestTime("missing-avatar-action");
        const response = await DELETE();
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("User does not have an avatar");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          context: "Missing avatar test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.UNIT,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime("fs-error-test");
      try {
        // Arrange
        vi.mocked(verifyToken).mockResolvedValueOnce({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const userWithAvatar = {
          ...mockUser,
          avatarUrl: `/avatars/${mockUser.id}-123456789.webp`,
        };

        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userWithAvatar);
        vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));
        vi.mocked(prisma.user.update).mockResolvedValueOnce({
          ...userWithAvatar,
          avatarUrl: null,
        });

        // Act
        const actionTimer = measureTestTime("fs-error-action");
        const response = await DELETE();
        expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        actionTimer.end();

        const data = await debugResponse<AvatarResponse>(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          context: "File system error test",
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
            unlink: vi.mocked(fs.unlink).mock.calls,
          },
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
});
