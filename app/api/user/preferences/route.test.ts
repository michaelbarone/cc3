import { prisma } from "@/app/lib/db/prisma";
import { createTestTimer, debugResponse } from "@/test/utils/helpers/debug";
import { createMockUser } from "@/test/utils/mocks/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Mock dependencies first
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

// Mock the auth helper
vi.mock("@/lib/auth/auth-options", () => ({
  getServerSession: vi.fn(),
}));

// Then import the mocked modules
import { verifyToken } from "@/app/lib/auth/jwt";

// Factory function for test data
const mockDate = new Date("2024-01-01T00:00:00.000Z");
const mockDateString = mockDate.toISOString();

const serializeUser = (user: any) => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

// Create base mock user with string dates
const mockUser = createMockUser({
  createdAt: mockDateString,
  updatedAt: mockDateString,
  lastLoginAt: mockDateString,
});

// Create Prisma-compatible mock with Date objects
const mockPrismaUser = createMockUser({
  createdAt: mockDate,
  updatedAt: mockDate,
  lastLoginAt: mockDate,
  menuPosition: "left" as const,
  themeMode: "light" as const,
});

// API responses should use serialized dates
const mockApiUser = {
  ...mockPrismaUser,
  createdAt: mockDate.toISOString(),
  updatedAt: mockDate.toISOString(),
  lastLoginAt: mockDate.toISOString(),
};

// Mock Prisma responses with the Prisma-compatible version
prisma.user.findUnique = vi.fn().mockResolvedValue(mockPrismaUser);

describe("API: /api/user/preferences", () => {
  const testTimer = createTestTimer();

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue(mockPrismaUser);
  });

  describe("GET", () => {
    it("should return user preferences when authenticated", async () => {
      testTimer.start("GET preferences - authenticated");
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        preferences: {
          themeMode: mockApiUser.themeMode,
          menuPosition: mockApiUser.menuPosition,
          lastActiveUrl: mockUser.lastActiveUrl,
        },
        raw: mockApiUser,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          menuPosition: true,
          themeMode: true,
          lastActiveUrl: true,
        },
      });
      testTimer.end("GET preferences - authenticated");
    });

    it("should return default values for null preferences", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockPrismaUser,
        menuPosition: null,
        themeMode: null,
        lastActiveUrl: null,
      });

      const response = await GET();
      const data = await response.json();
      await debugResponse(response);

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        preferences: {
          themeMode: null,
          menuPosition: null,
          lastActiveUrl: null,
        },
        raw: {
          ...mockUser,
          menuPosition: null,
          themeMode: null,
          lastActiveUrl: null,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();
      await debugResponse(response);

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
      await debugResponse(response);

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
      await debugResponse(response);

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
      testTimer.start("POST preferences - update menu position");
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      const updatedUser = createMockUser({ menuPosition: "side" });
      const updatedPrismaUser = {
        ...updatedUser,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedPrismaUser);

      const response = await POST(createRequest({ menuPosition: "side" }));
      const data = await response.json();
      await debugResponse(response);

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
      testTimer.end("POST preferences - update menu position");
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
      const updatedPrismaUser = {
        ...updatedUser,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedPrismaUser);

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();
      await debugResponse(response);

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
      const updatedPrismaUser = {
        ...updatedUser,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedPrismaUser);

      const response = await POST(
        createRequest({
          menuPosition: "side",
          themeMode: "light",
        }),
      );
      const data = await response.json();
      await debugResponse(response);

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
      await debugResponse(response);

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
      await debugResponse(response);

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should validate menu position values", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);

      const response = await POST(createRequest({ menuPosition: "invalid" }));
      const data = await response.json();
      await debugResponse(response);

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid menu position. Must be "side" or "top".' });
    });

    it("should validate theme mode values", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);

      const response = await POST(createRequest({ themeMode: "invalid" }));
      const data = await response.json();
      await debugResponse(response);

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid theme mode. Must be "light" or "dark".' });
    });

    it("should return 400 when no valid preferences provided", async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);

      const response = await POST(createRequest({}));
      const data = await response.json();
      await debugResponse(response);

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No valid preferences provided for update." });
    });

    it("should handle internal server errors", async () => {
      testTimer.start("POST preferences - error handling");
      vi.mocked(verifyToken).mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPrismaUser);
      const error = new Error("Database error");
      vi.mocked(prisma.user.update).mockRejectedValue(error);

      const response = await POST(createRequest({ themeMode: "light" }));
      const data = await response.json();

      console.error("Mock state during error:", {
        error,
        mockUser,
        verifyTokenCalls: vi.mocked(verifyToken).mock.calls,
        findUniqueCalls: vi.mocked(prisma.user.findUnique).mock.calls,
        updateCalls: vi.mocked(prisma.user.update).mock.calls,
      });

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Failed to update user preferences" });
      testTimer.end("POST preferences - error handling");
    });

    it("should update user preferences", async () => {
      const updatedPrefs = {
        themeMode: "dark" as const,
        menuPosition: "right" as const,
      };

      const updatedPrismaUser = {
        ...mockPrismaUser,
        ...updatedPrefs,
      };

      prisma.user.update = vi.fn().mockResolvedValue(updatedPrismaUser);

      const response = await POST({
        json: () => Promise.resolve(updatedPrefs),
      } as NextRequest);

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedPrefs);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockPrismaUser.id },
        data: updatedPrefs,
      });
    });
  });
});
