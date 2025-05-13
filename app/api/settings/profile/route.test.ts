import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt");
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Test data
const mockUser = {
  id: "user-123",
  username: "testuser",
  avatarUrl: "/avatars/test.jpg",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-02"),
  passwordHash: null,
  isAdmin: false,
  lastActiveUrl: null,
  lastLoginAt: new Date("2025-01-02"),
  menuPosition: null,
  themeMode: null,
};

const mockTokenPayload = {
  id: "user-123",
  username: "testuser",
  isAdmin: false,
};

describe("Profile Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/profile", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when user not found", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("returns user profile when authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      expect(data.profile.id).toBe(mockUser.id);
      expect(data.profile.username).toBe(mockUser.username);
      expect(data.profile.avatarUrl).toBe(mockUser.avatarUrl);
      expect(data.profile.createdAt).toBe(mockUser.createdAt.toISOString());
      expect(data.profile.updatedAt).toBe(mockUser.updatedAt.toISOString());
      expect(data.profile.passwordHash).toBe(mockUser.passwordHash);
      expect(data.profile.isAdmin).toBe(mockUser.isAdmin);
      expect(data.profile.lastActiveUrl).toBe(mockUser.lastActiveUrl);
      expect(data.profile.lastLoginAt).toBe(mockUser.lastLoginAt.toISOString());
      expect(data.profile.menuPosition).toBe(mockUser.menuPosition);
      expect(data.profile.themeMode).toBe(mockUser.themeMode);
    });

    it("handles database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get user profile");
    });
  });

  describe("PATCH /api/settings/profile", () => {
    const createRequest = (body: any) =>
      new NextRequest("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await PATCH(createRequest({ username: "newname" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when username is too short", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);

      const response = await PATCH(createRequest({ username: "ab" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username must be at least 3 characters long");
    });

    it("returns 400 when username is already taken", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "other-user" } as any);

      const response = await PATCH(createRequest({ username: "takenname" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username is already taken");
    });

    it("updates username successfully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        username: "newname",
      });

      const response = await PATCH(createRequest({ username: "newname" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeDefined();
      expect(data.profile.id).toBe(mockUser.id);
      expect(data.profile.username).toBe("newname");
      expect(data.profile.avatarUrl).toBe(mockUser.avatarUrl);
      expect(data.profile.createdAt).toBe(mockUser.createdAt.toISOString());
      expect(data.profile.updatedAt).toBe(mockUser.updatedAt.toISOString());
      expect(data.profile.passwordHash).toBe(mockUser.passwordHash);
      expect(data.profile.isAdmin).toBe(mockUser.isAdmin);
      expect(data.profile.lastActiveUrl).toBe(mockUser.lastActiveUrl);
      expect(data.profile.lastLoginAt).toBe(mockUser.lastLoginAt.toISOString());
      expect(data.profile.menuPosition).toBe(mockUser.menuPosition);
      expect(data.profile.themeMode).toBe(mockUser.themeMode);
      expect(data.message).toBe("Profile updated successfully");
    });

    it("handles database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findFirst).mockRejectedValue(new Error("Database error"));

      const response = await PATCH(createRequest({ username: "newname" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update user profile");
    });
  });
});
