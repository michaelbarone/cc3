import { POST as avatarPost } from "@/app/api/user/avatar/route";
import type { JwtPayload } from "@/app/lib/auth/jwt";
import path from 'path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockFileSystem, createMockSharp } from '../mocks/filesystem';
import { createMockNextRequest } from '../mocks/next';
import { mockPrismaClient } from '../mocks/prisma';
import { clearTestFiles, getCreatedFiles, initializeTestFiles } from './index';

// Mock JWT verification
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn().mockResolvedValue({
    id: "test-user",
    username: "testuser",
    isAdmin: true,
  }),
}));

describe("File Operation Cleanup Tests", () => {
  // Common mock data
  const mockAdminJwtPayload: JwtPayload = {
    id: "admin-1",
    username: "admin",
    isAdmin: true,
  };

  beforeAll(() => {
    // Initialize mock filesystem
    createMockFileSystem();
    createMockSharp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOCK_SHARP_FAIL = undefined;
    initializeTestFiles();
  });

  afterEach(() => {
    clearTestFiles();
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
      // Setup
      const oldAvatarPath = path.join(process.cwd(), "public/avatars/old-avatar.webp");
      const newAvatarPath = path.join(process.cwd(), "public/avatars/new-avatar.webp");

      // Mock user with existing avatar
      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: "/avatars/old-avatar.webp"
      });

      // Create mock request
      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.png");
      const request = createMockNextRequest("http://localhost/api/user/avatar", {
        method: "POST",
        body: formData
      });

      // Execute
      await avatarPost(request);

      // Verify
      const files = getCreatedFiles();
      expect(files.has(oldAvatarPath)).toBe(false);
      expect(files.has(newAvatarPath)).toBe(true);
    });
  });
});
