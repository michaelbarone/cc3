import { GET, POST } from "@/app/api/user-preferences/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
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

describe("User Preferences API", () => {
  const mockUser = {
    id: "user123",
    username: "testuser",
    lastActiveUrl: "https://example.com",
    theme: "light",
    language: "en",
    menuPosition: "left",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user-preferences", () => {
    it("should return user preferences when authenticated", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        preferences: {
          lastActiveUrl: mockUser.lastActiveUrl,
        },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          lastActiveUrl: true,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      (verifyToken as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when user not found", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should handle internal server errors", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST /api/user-preferences", () => {
    const mockPreferences = {
      lastActiveUrl: "https://newurl.com",
      theme: "dark",
      language: "fr",
      menuPosition: "right",
    };

    it("should update user preferences when authenticated", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({ ...mockUser, ...mockPreferences });

      const request = new Request("http://localhost/api/user-preferences", {
        method: "POST",
        body: JSON.stringify(mockPreferences),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: mockPreferences,
      });
    });

    it("should return 401 when not authenticated", async () => {
      (verifyToken as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/user-preferences", {
        method: "POST",
        body: JSON.stringify(mockPreferences),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 for invalid preferences data", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/user-preferences", {
        method: "POST",
        body: JSON.stringify(null),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid preferences data" });
    });

    it("should only update allowed preference fields", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({ ...mockUser, ...mockPreferences });

      const requestData = {
        ...mockPreferences,
        invalidField: "should be ignored",
      };

      const request = new Request("http://localhost/api/user-preferences", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: mockPreferences,
      });
    });

    it("should handle internal server errors during update", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/user-preferences", {
        method: "POST",
        body: JSON.stringify(mockPreferences),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});
