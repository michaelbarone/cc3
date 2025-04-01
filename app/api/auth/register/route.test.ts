import { loginUser, registerUser } from "@/app/lib/auth/auth-service";
import type { JwtPayload } from "@/app/lib/auth/jwt";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/auth-service", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}));

vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
    },
  },
}));

describe("API: /api/auth/register", () => {
  const mockUser = {
    id: "1",
    username: "testuser",
    isAdmin: false,
    avatarUrl: undefined,
    menuPosition: "left",
    themeMode: "light",
    lastLoginAt: new Date("2025-03-31T10:44:17.645Z").toISOString(),
    hasPassword: true,
    lastActiveUrl: "/",
  };

  const mockAppConfig = {
    id: "app-config",
    registrationEnabled: true,
  };

  const createNextRequest = (body: any) => {
    return new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default app config
    vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockAppConfig);
  });

  describe("POST", () => {
    it("should successfully register a new user", async () => {
      const requestBody = {
        username: "newuser",
        password: "password123",
      };

      // Mock successful registration
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      // Mock successful login after registration
      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        user: mockUser,
      });
      expect(registerUser).toHaveBeenCalledWith(requestBody.username, requestBody.password, false);
      expect(loginUser).toHaveBeenCalledWith(requestBody.username, requestBody.password);
    });

    it("should return error when username is missing", async () => {
      const requestBody = {
        password: "password123",
      };

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Username is required",
      });
      expect(registerUser).not.toHaveBeenCalled();
      expect(loginUser).not.toHaveBeenCalled();
    });

    it("should return error when registration is disabled", async () => {
      const requestBody = {
        username: "newuser",
        password: "password123",
      };

      // Mock registration disabled
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        id: "app-config",
        registrationEnabled: false,
      });

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "User registration is currently disabled",
      });
      expect(registerUser).not.toHaveBeenCalled();
      expect(loginUser).not.toHaveBeenCalled();
    });

    it("should allow admin to create another admin user", async () => {
      const requestBody = {
        username: "newadmin",
        password: "password123",
        isAdmin: true,
      };

      // Mock admin user verification
      vi.mocked(verifyToken).mockResolvedValue({
        id: "1",
        username: "admin",
        isAdmin: true,
      } as JwtPayload);

      // Mock successful registration
      vi.mocked(registerUser).mockResolvedValue({
        success: true,
        user: { ...mockUser, isAdmin: true },
      });

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        user: { ...mockUser, isAdmin: true },
      });
      expect(registerUser).toHaveBeenCalledWith(requestBody.username, requestBody.password, true);
      expect(loginUser).not.toHaveBeenCalled(); // No auto-login for admin creation
    });

    it("should prevent non-admin from creating admin user", async () => {
      const requestBody = {
        username: "newadmin",
        password: "password123",
        isAdmin: true,
      };

      // Mock non-admin user verification
      vi.mocked(verifyToken).mockResolvedValue({
        id: "1",
        username: "user",
        isAdmin: false,
      } as JwtPayload);

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: "Unauthorized",
      });
      expect(registerUser).not.toHaveBeenCalled();
      expect(loginUser).not.toHaveBeenCalled();
    });

    it("should handle registration service errors", async () => {
      const requestBody = {
        username: "newuser",
        password: "password123",
      };

      // Mock registration failure
      vi.mocked(registerUser).mockResolvedValue({
        success: false,
        message: "Username already exists",
      });

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Username already exists",
      });
      expect(registerUser).toHaveBeenCalled();
      expect(loginUser).not.toHaveBeenCalled();
    });

    it("should handle internal server errors", async () => {
      const requestBody = {
        username: "newuser",
        password: "password123",
      };

      // Mock registration throwing error
      vi.mocked(registerUser).mockRejectedValue(new Error("Database error"));

      const response = await POST(createNextRequest(requestBody));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Internal server error",
      });
      expect(registerUser).toHaveBeenCalled();
      expect(loginUser).not.toHaveBeenCalled();
    });
  });
});
