import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { generateToken, verifyToken } from "@/app/lib/auth/jwt";
import { verifyPassword } from "@/app/lib/auth/password";
import { clearRateLimits } from "@/app/lib/auth/rate-limit";
import { prisma } from "@/app/lib/db/prisma";
import { debugResponse, measureTestTime } from "@/test/utils/helpers/debug";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
  generateToken: vi.fn(),
  setAuthCookie: vi.fn(),
  removeAuthCookie: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
}));

// Create mock cookie store
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

// Mock the cookies function
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

// Mock NextRequest and NextResponse
vi.mock("next/server", () => {
  class MockHeaders extends Headers {
    append(name: string, value: string): void {
      super.append(name, value);
    }
    get(name: string): string | null {
      return super.get(name);
    }
  }

  class MockNextRequest {
    private _url: string;
    private _method: string;
    private _headers: Headers;
    private _body: any;

    constructor(url: string, init?: { method?: string; headers?: HeadersInit; body?: string }) {
      this._url = url;
      this._method = init?.method || "GET";
      this._headers = new MockHeaders(init?.headers || {});
      this._body = init?.body;
    }

    get url() {
      return this._url;
    }

    get method() {
      return this._method;
    }

    get headers() {
      return this._headers;
    }

    async json() {
      return this._body ? JSON.parse(this._body) : undefined;
    }
  }

  class MockNextResponse {
    public status: number;
    public headers: Headers;
    public cookies: typeof mockCookieStore;
    private _data: any;

    constructor(data: any, init?: { status?: number; headers?: HeadersInit }) {
      this._data = data;
      this.status = init?.status || 200;
      this.headers = new MockHeaders(init?.headers || {});
      this.cookies = mockCookieStore;
    }

    async json() {
      return this._data;
    }

    static json(data: any, init?: { status?: number; headers?: HeadersInit }) {
      return new MockNextResponse(data, init);
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

describe("Authentication API", () => {
  const mockUser = {
    id: "1",
    username: "testuser",
    isAdmin: false,
    passwordHash: "hashed_password",
    lastActiveUrl: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastLoginAt: null,
    avatarUrl: null,
    menuPosition: "top" as const,
    themeMode: "dark" as const,
  };

  const mockJwtPayload = {
    id: mockUser.id,
    username: mockUser.username,
    isAdmin: mockUser.isAdmin,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: "mock-token" });
    clearRateLimits(); // Clear rate limits before each test
  });

  describe("POST /api/auth/login", () => {
    describe("Rate Limiting", () => {
      it("allows 5 attempts within 1 minute window", async () => {
        const testTimer = measureTestTime();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(verifyPassword).mockResolvedValue(false);

        // Make 5 failed attempts
        for (let i = 0; i < 5; i++) {
          const request = {
            headers: new Headers({
              "x-forwarded-for": "127.0.0.1",
              "content-type": "application/json",
            }),
            json: async () => ({
              username: mockUser.username,
              password: "wrong_password",
            }),
          } as unknown as NextRequest;

          const response = await login(request);
          await debugResponse(response);
          expect(response.status).toBe(401);
          const data = await response.json();
          expect(data.remainingAttempts).toBe(4 - i);
        }

        // 6th attempt should be rate limited
        const request = {
          headers: new Headers({
            "x-forwarded-for": "127.0.0.1",
            "content-type": "application/json",
          }),
          json: async () => ({
            username: mockUser.username,
            password: "wrong_password",
          }),
        } as unknown as NextRequest;

        const response = await login(request);
        await debugResponse(response);
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toBe("Too many login attempts");
        expect(data.remainingAttempts).toBe(0);
        expect(data.resetTime).toBeDefined();
        testTimer.end();
      });

      it("includes rate limit headers in responses", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(verifyPassword).mockResolvedValue(false);

        const request = {
          headers: new Headers({
            "x-forwarded-for": "127.0.0.1",
            "content-type": "application/json",
          }),
          json: async () => ({
            username: mockUser.username,
            password: "wrong_password",
          }),
        } as unknown as NextRequest;

        const response = await login(request);
        expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
        expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
        expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
      });

      it("tracks rate limits separately for different IPs", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(verifyPassword).mockResolvedValue(false);

        const createRequest = (ip: string) =>
          ({
            headers: new Headers({
              "x-forwarded-for": ip,
              "content-type": "application/json",
            }),
            json: async () => ({
              username: mockUser.username,
              password: "wrong_password",
            }),
          }) as unknown as NextRequest;

        // Make 5 attempts from first IP
        const request1 = createRequest("127.0.0.1");
        for (let i = 0; i < 5; i++) {
          await login(request1);
        }

        // 6th attempt from first IP should be rate limited
        const response1 = await login(request1);
        expect(response1.status).toBe(429);

        // First attempt from second IP should be allowed
        const request2 = createRequest("127.0.0.2");
        const response2 = await login(request2);
        expect(response2.status).toBe(401);
      });
    });

    describe("Password-based login", () => {
      it("authenticates user with valid credentials", async () => {
        const testTimer = measureTestTime();
        const password = "correct_password";
        const token = "valid_token";
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(verifyPassword).mockResolvedValue(true);
        vi.mocked(generateToken).mockReturnValue(token);
        vi.mocked(prisma.user.update).mockResolvedValue({
          ...mockUser,
          lastLoginAt: new Date(),
        });

        const request = new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: mockUser.username,
            password,
          }),
        });

        const response = await login(request);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user).toEqual(
          expect.objectContaining({
            id: mockUser.id,
            username: mockUser.username,
          }),
        );
        expect(mockCookieStore.set).toHaveBeenCalledWith({
          name: "auth_token",
          value: token,
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/",
          maxAge: 24 * 60 * 60,
        });
        testTimer.end();
      });

      it("returns 401 for invalid password", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        vi.mocked(verifyPassword).mockResolvedValueOnce(false);

        const request = new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: mockUser.username,
            password: "wrong_password",
          }),
        });

        const response = await login(request);
        expect(response.status).toBe(401);
      });

      it("returns 401 for missing password", async () => {
        const request = new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: "testuser",
          }),
        });

        const response = await login(request);
        expect(response.status).toBe(401);
      });
    });

    describe("Passwordless login", () => {
      it("authenticates user without password if no password set", async () => {
        const userWithoutPassword = { ...mockUser, passwordHash: null };
        vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithoutPassword);
        vi.mocked(generateToken).mockReturnValue("valid_token");

        const request = new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: mockUser.username,
          }),
        });

        const response = await login(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user).toEqual(
          expect.objectContaining({
            id: mockUser.id,
            username: mockUser.username,
          }),
        );
      });

      it("requires password if password is set", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

        const request = new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: mockUser.username,
          }),
        });

        const response = await login(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Password required");
        expect(data.requiresPassword).toBe(true);
      });
    });

    it("returns 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "nonexistent",
          password: "any_password",
        }),
      });

      const response = await login(request);
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/auth/session", () => {
    it("returns session data for valid token", async () => {
      const testTimer = measureTestTime();
      vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      mockCookieStore.get.mockReturnValue({ value: "valid_token" });

      const response = await getSession();
      await debugResponse(response);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
        }),
      );
      testTimer.end();
    });

    it("returns null for invalid token", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null);
      mockCookieStore.get.mockReturnValue({ value: "invalid_token" });

      const response = await getSession();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
    });

    it("returns null for missing token", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const response = await getSession();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
    });

    it("returns null for non-existent user", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockJwtPayload);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await getSession();
      const data = await response.json();

      expect(data.user).toBeNull();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears auth token cookie", async () => {
      const testTimer = measureTestTime();
      const response = await logout();
      await debugResponse(response);
      expect(response.status).toBe(200);
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_token");
      testTimer.end();
    });

    it("returns success even if no session exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const response = await logout();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
