import { loginUser } from "@/app/lib/auth/auth-service";
import { checkRateLimit } from "@/app/lib/auth/rate-limit";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock the auth service and rate limit modules
vi.mock("@/app/lib/auth/auth-service");
vi.mock("@/app/lib/auth/rate-limit");

describe("POST /api/auth/login", () => {
  const mockUser = {
    id: "1",
    username: "testuser",
    isAdmin: false,
    hasPassword: true,
    lastActiveUrl: "/",
    avatarUrl: undefined,
    menuPosition: "left",
    themeMode: "light",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockToken = "mock-auth-token";

  beforeEach(() => {
    vi.resetAllMocks();
    // Default successful rate limit check
    vi.mocked(checkRateLimit).mockReturnValue({
      success: true,
      remainingAttempts: 5,
      resetTime: new Date(Date.now() + 3600000),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limit is exceeded", async () => {
      // Mock rate limit exceeded
      vi.mocked(checkRateLimit).mockReturnValue({
        success: false,
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 3600000),
      });

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toHaveProperty("error", "Too many login attempts");
      expect(data).toHaveProperty("resetTime");
      expect(data).toHaveProperty("remainingAttempts", 0);
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when username is missing", async () => {
      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: "password" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error", "Username is required");
    });
  });

  describe("Authentication", () => {
    it("should successfully log in a user with valid credentials", async () => {
      // Mock successful login
      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: mockUser,
        token: mockToken,
      });

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      // Check user properties individually instead of the whole object
      expect(data.user).toHaveProperty("id", mockUser.id);
      expect(data.user).toHaveProperty("username", mockUser.username);
      expect(data.user).toHaveProperty("isAdmin", mockUser.isAdmin);

      // Check if auth cookie is set
      const cookies = response.headers.get("Set-Cookie");
      expect(cookies).toContain("auth_token");
      expect(cookies).toContain("HttpOnly");
      expect(cookies).toContain("SameSite=strict");
    });

    it("should return 404 when user is not found", async () => {
      // Mock user not found
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        message: "User not found",
      });

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "nonexistent", password: "password" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error", "User not found");
    });

    it("should return 401 with requiresPassword when password is required", async () => {
      // Mock password required response
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        message: "Password required",
        requiresPassword: true,
      });

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("error", "Password required");
      expect(data).toHaveProperty("requiresPassword", true);
      expect(data).toHaveProperty("remainingAttempts");
    });

    it("should return 401 for invalid credentials", async () => {
      // Mock invalid credentials
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        message: "Invalid credentials",
      });

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "wrongpassword" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("error", "Invalid credentials");
      expect(data).toHaveProperty("remainingAttempts");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 for internal server errors", async () => {
      // Mock internal server error
      vi.mocked(loginUser).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "password" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("error", "Internal server error");
    });
  });
});
