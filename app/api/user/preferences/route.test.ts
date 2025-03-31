import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

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

describe("API: /api/user/preferences", () => {
  const mockUser = {
    id: "1",
    username: "testuser",
    isAdmin: false,
    menuPosition: "top",
    themeMode: "dark",
    lastActiveUrl: "https://example.com",
    language: "en",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("should return user preferences when authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          menuPosition: mockUser.menuPosition,
          themeMode: mockUser.themeMode,
        },
        rawPreferences: mockUser,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          menuPosition: true,
          themeMode: true,
        },
      });
    });

    it("should return default values for null preferences", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        menuPosition: null,
        themeMode: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          menuPosition: "top",
          themeMode: "dark",
        },
        rawPreferences: {
          ...mockUser,
          menuPosition: null,
          themeMode: null,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should handle internal server errors", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to fetch user preferences" });
    });
  });

  describe("POST", () => {
    const createRequest = (body: any) => {
      return new NextRequest("http://localhost/api/user/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    };

    it("should update menu position successfully", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      const updatedUser = {
        ...mockUser,
        menuPosition: "side",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const response = await POST(createRequest({ menuPosition: "side" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          menuPosition: "side",
          themeMode: mockUser.themeMode,
        },
        rawPreferences: updatedUser,
        success: true,
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { menuPosition: "side" },
        select: {
          id: true,
          menuPosition: true,
          themeMode: true,
        },
      });
    });

    it("should update theme mode successfully", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      const updatedUser = {
        ...mockUser,
        themeMode: "light",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          menuPosition: mockUser.menuPosition,
          themeMode: "light",
        },
        rawPreferences: updatedUser,
        success: true,
      });
    });

    it("should update multiple preferences successfully", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      const updatedUser = {
        ...mockUser,
        menuPosition: "side",
        themeMode: "light",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const response = await POST(
        createRequest({
          menuPosition: "side",
          themeMode: "light",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          menuPosition: "side",
          themeMode: "light",
        },
        rawPreferences: updatedUser,
        success: true,
      });
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should validate menu position values", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await POST(createRequest({ menuPosition: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid menu position. Must be "side" or "top".' });
    });

    it("should validate theme mode values", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await POST(createRequest({ themeMode: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid theme mode. Must be "light" or "dark".' });
    });

    it("should return 400 when no valid preferences provided", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No valid preferences provided for update." });
    });

    it("should handle internal server errors", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockRejectedValue(new Error("Database error"));

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to update user preferences" });
    });
  });
});
