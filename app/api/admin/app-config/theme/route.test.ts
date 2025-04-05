import { mockVerifyToken } from "@/app/lib/test/auth-mock";
import { createTestAdmin, createTestAppConfig, createTestUser } from "@/app/lib/test/data/admin";
import { debugError, debugMockCalls, debugResponse } from "@/app/lib/test/debug";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PATCH } from "./route";

// Mock external dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: mockVerifyToken,
}));

// Mock Prisma client first
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      upsert: vi.fn(),
    },
  } as unknown as PrismaClient,
}));

// Then create the mock implementation
const mockUpsert = vi.mocked(vi.fn());
mockUpsert.mockImplementation(() => Promise.resolve(createTestAppConfig({ loginTheme: "light" })));

describe("Theme API Endpoint", () => {
  const mockAdminToken = createTestAdmin();
  const mockNonAdminToken = createTestUser();

  const mockRequest = (theme?: string) =>
    new NextRequest("http://localhost/api/admin/app-config/theme", {
      method: "PATCH",
      body: theme ? JSON.stringify({ loginTheme: theme }) : "invalid json",
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ isAdmin: true });
    console.time("test-execution");
  });

  afterEach(() => {
    console.timeEnd("test-execution");
    // Debug mock states after each test
    debugMockCalls(vi.mocked(mockVerifyToken), "verifyToken");
    debugMockCalls(mockUpsert, "appConfig.upsert");
  });

  describe("PATCH /api/admin/app-config/theme", () => {
    test("successfully updates theme to light", async () => {
      const expectedConfig = createTestAppConfig({ loginTheme: "light" });
      mockUpsert.mockResolvedValue(expectedConfig);

      const response = await PATCH(mockRequest("light"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("light");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "app-config" },
        update: { loginTheme: "light" },
        create: {
          appName: "Control Center",
          appLogo: null,
          loginTheme: "light",
        },
      });
    });

    test("successfully updates theme to dark", async () => {
      const expectedConfig = createTestAppConfig({ loginTheme: "dark" });
      mockUpsert.mockResolvedValue(expectedConfig);

      const response = await PATCH(mockRequest("dark"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("dark");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "app-config" },
        update: { loginTheme: "dark" },
        create: {
          appName: "Control Center",
          appLogo: null,
          loginTheme: "dark",
        },
      });
    });

    test("handles unauthorized access", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await PATCH(mockRequest("light"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    test("handles non-admin access", async () => {
      mockVerifyToken.mockResolvedValue({ isAdmin: false });

      const response = await PATCH(mockRequest("light"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin privileges required");
    });

    test("handles missing theme", async () => {
      const response = await PATCH(mockRequest());
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error updating login theme");
    });

    test("handles invalid theme value", async () => {
      const response = await PATCH(mockRequest("invalid"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response
      await debugResponse(debugClone);

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid login theme (light or dark) is required");
    });

    test("handles database error", async () => {
      mockUpsert.mockRejectedValue(new Error("Database error"));

      const response = await PATCH(mockRequest("light"));
      const debugClone = response.clone();
      const data = await response.json();

      // Debug the response and error
      await debugResponse(debugClone);
      debugError(new Error("Database error"));

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error updating login theme");
    });
  });
});
