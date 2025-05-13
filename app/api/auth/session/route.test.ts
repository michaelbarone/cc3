import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("API: /api/auth/session", () => {
  const mockUser = {
    id: "1",
    username: "testuser",
    passwordHash: null,
    isAdmin: false,
    lastActiveUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date("2025-03-31T10:44:17.645Z"),
    avatarUrl: null,
    menuPosition: "left",
    themeMode: "light",
  };

  const mockToken = "mock-auth-token";
  const mockTokenPayload = {
    id: "1",
    username: "testuser",
    isAdmin: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default cookie mock
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    } as any);
  });

  describe("GET", () => {
    it("should return user data for valid session", async () => {
      // Mock successful token verification
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      // Mock successful user lookup
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(mockUser.id);
      expect(data.user.username).toBe(mockUser.username);
      expect(data.user.isAdmin).toBe(mockUser.isAdmin);
      expect(data.user.avatarUrl).toBe(mockUser.avatarUrl);
      expect(data.user.menuPosition).toBe(mockUser.menuPosition);
      expect(data.user.themeMode).toBe(mockUser.themeMode);
      expect(data.user.lastLoginAt).toBe(mockUser.lastLoginAt.toISOString());
      expect(verifyToken).toHaveBeenCalledWith(mockToken);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockTokenPayload.id },
        select: {
          id: true,
          username: true,
          isAdmin: true,
          avatarUrl: true,
          menuPosition: true,
          themeMode: true,
          lastLoginAt: true,
        },
      });
    });

    it("should return null user when no auth token cookie exists", async () => {
      // Mock missing auth token
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: null });
      expect(verifyToken).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should return null user when token verification fails", async () => {
      // Mock failed token verification
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: null });
      expect(verifyToken).toHaveBeenCalledWith(mockToken);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should return null user when user is not found in database", async () => {
      // Mock successful token verification but user not found
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: null });
      expect(verifyToken).toHaveBeenCalledWith(mockToken);
      expect(prisma.user.findUnique).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      // Mock error during token verification
      vi.mocked(verifyToken).mockRejectedValue(new Error("Verification error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: null });
      expect(verifyToken).toHaveBeenCalledWith(mockToken);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
