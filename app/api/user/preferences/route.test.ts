/// <reference types="node" />
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Types
interface UserPreferences {
  themeMode: "light" | "dark" | null;
  menuPosition: "left" | "top" | null;
  lastActiveUrl: string | null;
}

interface PreferencesResponse {
  success: boolean;
  preferences: UserPreferences;
  raw?: any;
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

// Factory function for test data
const mockDate = new Date("2024-01-01T00:00:00.000Z");

const mockUser = {
  id: "test-user",
  username: "testuser",
  isAdmin: false,
  email: "test@example.com",
  avatarUrl: null,
  passwordHash: "hashed-password",
  themeMode: "light",
  menuPosition: "left",
  lastActiveUrl: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  lastLoginAt: mockDate,
};

describe("API: /api/user/preferences", () => {
  const suiteTimer = measureTestTime("User Preferences API Suite");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
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

  describe("GET", () => {
    it("should return user preferences when authenticated", async () => {
      const testTimer = measureTestTime("GET preferences - authenticated");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const response = await GET();
        const data = await debugResponse<PreferencesResponse>(response);

        const mockUserWithStringDates = {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
          lastLoginAt: mockUser.lastLoginAt.toISOString(),
        };

        expect(response.status).toBe(200);
        expect(data).toEqual({
          preferences: {
            themeMode: mockUser.themeMode,
            menuPosition: mockUser.menuPosition,
          },
          rawPreferences: mockUserWithStringDates,
        });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.id },
          select: {
            id: true,
            menuPosition: true,
            themeMode: true,
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
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

    it("should return 401 when not authenticated", async () => {
      const testTimer = measureTestTime("GET preferences - unauthorized");
      try {
        vi.mocked(verifyToken).mockResolvedValue(null);

        const response = await GET();
        const data = await debugResponse(response);

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user not found", async () => {
      const testTimer = measureTestTime("GET preferences - user not found");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await GET();
        const data = await debugResponse(response);

        expect(response.status).toBe(404);
        expect(data).toEqual({ error: "User not found" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should handle internal server errors", async () => {
      const testTimer = measureTestTime("GET preferences - server error");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("Database error"));

        const response = await GET();
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to fetch user preferences" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
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
      const testTimer = measureTestTime("POST preferences - update menu position");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const updatedUser = {
          ...mockUser,
          menuPosition: "top",
        };

        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

        const response = await POST(createRequest({ menuPosition: "top" }));
        const data = await debugResponse(response);

        const updatedUserWithStringDates = {
          ...updatedUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
          lastLoginAt: mockUser.lastLoginAt.toISOString(),
        };

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          preferences: {
            menuPosition: "top",
            themeMode: mockUser.themeMode,
          },
          rawPreferences: updatedUserWithStringDates,
        });
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: mockUser.id },
          data: { menuPosition: "top" },
          select: {
            id: true,
            menuPosition: true,
            themeMode: true,
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          update: vi.mocked(prisma.user.update).mock.calls,
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

    it("should validate menu position values", async () => {
      const testTimer = measureTestTime("POST preferences - validate menu position");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const response = await POST(createRequest({ menuPosition: "invalid" }));
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: 'Invalid menu position. Must be "side" or "top".' });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should validate theme mode values", async () => {
      const testTimer = measureTestTime("POST preferences - validate theme mode");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        const response = await POST(createRequest({ themeMode: "invalid" }));
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: 'Invalid theme mode. Must be "light" or "dark".' });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should handle internal server errors", async () => {
      const testTimer = measureTestTime("POST preferences - server error");
      try {
        vi.mocked(verifyToken).mockResolvedValue({
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        });

        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.user.update).mockRejectedValue(new Error("Database error"));

        const response = await POST(createRequest({ themeMode: "light" }));
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to update user preferences" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          update: vi.mocked(prisma.user.update).mock.calls,
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
