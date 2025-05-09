import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { generateToken, verifyToken } from "@/app/lib/auth/jwt";
import { verifyPassword } from "@/app/lib/auth/password";
import { clearRateLimits } from "@/app/lib/auth/rate-limit";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { createMockErrorResponse, createMockUser } from "@/test/mocks/factories/auth.factory";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Test request factory
const createTestRequest = (options: {
  url?: string;
  method?: string;
  ip?: string;
  body?: Record<string, any>;
}) => {
  const {
    url = "http://localhost/api/auth/login",
    method = "POST",
    ip = "127.0.0.1",
    body,
  } = options;

  return new NextRequest(url, {
    method,
    headers: {
      "x-forwarded-for": ip,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
  generateToken: vi.fn().mockImplementation((payload) => Promise.resolve("valid_token")),
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

    clone() {
      return new MockNextResponse(this._data, {
        status: this.status,
        headers: this.headers,
      });
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
  const mockUser = createMockUser();
  const mockToken = "mock-token";

  const mockJwtPayload = {
    id: mockUser.id,
    username: mockUser.username,
    isAdmin: mockUser.isAdmin,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: mockToken });
    clearRateLimits(); // Clear rate limits before each test
  });

  describe("POST /api/auth/login", () => {
    describe("Rate Limiting", () => {
      it("allows 5 attempts within 1 minute window", async () => {
        const testTimer = measureTestTime("rate-limit-test");
        try {
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
            expect(data).toEqual({
              error: "Invalid password",
              remainingAttempts: 4 - i,
            });
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
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("includes rate limit headers in responses", async () => {
        const testTimer = measureTestTime("rate-limit-headers-test");
        try {
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
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("tracks rate limits separately for different IPs", async () => {
        const testTimer = measureTestTime("rate-limit-ip-test");
        try {
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
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Password-based login", () => {
      it("authenticates user with valid credentials", async () => {
        const testTimer = measureTestTime("valid-login-test");
        try {
          const password = "correct_password";
          const token = "valid_token";

          vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
          vi.mocked(verifyPassword).mockResolvedValue(true);
          vi.mocked(generateToken).mockResolvedValue(token);

          const request = {
            headers: new Headers({
              "content-type": "application/json",
            }),
            json: async () => ({
              username: mockUser.username,
              password,
            }),
          } as unknown as NextRequest;

          const response = await login(request);
          await debugResponse(response);
          expect(response.status).toBe(200);

          const data = await response.json();
          expect(data).toEqual({
            success: true,
            user: {
              id: mockUser.id,
              username: mockUser.username,
              isAdmin: mockUser.isAdmin,
              hasPassword: true,
              lastActiveUrl: undefined,
              avatarUrl: undefined,
              menuPosition: "top",
              themeMode: "dark",
              createdAt: mockUser.createdAt,
              updatedAt: mockUser.updatedAt,
              lastLoginAt: null,
            },
          });

          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("returns 401 for invalid password", async () => {
        const testTimer = measureTestTime("invalid-password-test");
        try {
          vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
          vi.mocked(verifyPassword).mockResolvedValueOnce(false);

          const request = createTestRequest({
            body: {
              username: mockUser.username,
              password: "wrongpassword",
            },
          });

          const response = await login(request);
          await debugResponse(response);
          expect(response.status).toBe(401);

          const data = await response.json();
          expect(data).toEqual(createMockErrorResponse("Invalid password", 4));
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("returns 401 for missing password", async () => {
        const testTimer = measureTestTime("missing-password-test");
        try {
          const request = createTestRequest({
            body: { username: "testuser" },
          });

          const response = await login(request);
          await debugResponse(response);
          expect(response.status).toBe(401);

          const data = await response.json();
          expect(data).toEqual({
            error: "Password required",
            requiresPassword: true,
            remainingAttempts: 4,
          });
          expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
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
      const testTimer = measureTestTime("non-existent-user-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

        const request = createTestRequest({
          body: {
            username: "nonexistent",
            password: "any_password",
          },
        });

        const response = await login(request);
        await debugResponse(response);
        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toEqual(createMockErrorResponse("User not found"));
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 401 for invalid password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const request = {
        headers: new Headers({
          "content-type": "application/json",
        }),
        json: async () => ({
          username: mockUser.username,
          password: "wrongpassword",
        }),
      } as unknown as NextRequest;

      const response = await login(request);
      await debugResponse(response);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({
        error: "Invalid password",
        remainingAttempts: 4,
      });
    });
  });

  describe("GET /api/auth/session", () => {
    it("returns session data for valid token", async () => {
      const testTimer = measureTestTime("session-data-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
        mockCookieStore.get.mockReturnValue({ value: "valid_token" });

        const response = await getSession();
        await debugResponse(response);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.user).toEqual(
          expect.objectContaining({
            id: mockUser.id,
            username: mockUser.username,
          }),
        );
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns null for invalid token", async () => {
      const testTimer = measureTestTime("invalid-token-test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(null);
        mockCookieStore.get.mockReturnValue({ value: "invalid_token" });

        const response = await getSession();
        await debugResponse(response);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.user).toBeNull();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns null for missing token", async () => {
      const testTimer = measureTestTime("missing-token-test");
      try {
        mockCookieStore.get.mockReturnValue(undefined);

        const response = await getSession();
        await debugResponse(response);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.user).toBeNull();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns null for non-existent user", async () => {
      const testTimer = measureTestTime("non-existent-user-session-test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(mockJwtPayload);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await getSession();
        await debugResponse(response);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.user).toBeNull();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears auth token cookie", async () => {
      const testTimer = measureTestTime("logout-test");
      try {
        const response = await logout();
        await debugResponse(response);
        expect(response.status).toBe(200);
        expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_token");

        const data = await response.json();
        expect(data).toEqual({ success: true });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns success even if no session exists", async () => {
      const testTimer = measureTestTime("no-session-logout-test");
      try {
        mockCookieStore.get.mockReturnValue(undefined);

        const response = await logout();
        await debugResponse(response);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual({ success: true });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
