import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createMockUser, createTestAppConfig } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { AppConfig } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PATCH } from "./route";

// Define response types
type ErrorResponse = {
  error: string;
};

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      upsert: vi.fn(),
    },
  },
}));

describe("Theme API Endpoint", () => {
  const suiteTimer = measureTestTime("Theme API Suite");
  const mockAdminUser = createMockUser({ isAdmin: true });
  const mockNonAdminUser = createMockUser({ isAdmin: false });

  const mockRequest = (theme?: string) =>
    new NextRequest("http://localhost/api/admin/app-config/theme", {
      method: "PATCH",
      body: theme ? JSON.stringify({ loginTheme: theme }) : "invalid json",
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
  });

  afterEach(() => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.appConfig.upsert), "appConfig.upsert");
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("PATCH /api/admin/app-config/theme", () => {
    test("successfully updates theme to light", async () => {
      const testTimer = measureTestTime("update theme light test");
      try {
        const expectedConfig = createTestAppConfig({ loginTheme: "light" });
        vi.mocked(prisma.appConfig.upsert).mockResolvedValue(expectedConfig);

        const response = await PATCH(mockRequest("light"));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data.loginTheme).toBe("light");
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          update: { loginTheme: "light" },
          create: {
            appName: "Control Center",
            appLogo: null,
            loginTheme: "light",
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("successfully updates theme to dark", async () => {
      const testTimer = measureTestTime("update theme dark test");
      try {
        const expectedConfig = createTestAppConfig({ loginTheme: "dark" });
        vi.mocked(prisma.appConfig.upsert).mockResolvedValue(expectedConfig);

        const response = await PATCH(mockRequest("dark"));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data.loginTheme).toBe("dark");
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          update: { loginTheme: "dark" },
          create: {
            appName: "Control Center",
            appLogo: null,
            loginTheme: "dark",
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("handles unauthorized access", async () => {
      const testTimer = measureTestTime("unauthorized test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(null);

        const response = await PATCH(mockRequest("light"));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("handles non-admin access", async () => {
      const testTimer = measureTestTime("forbidden test");
      try {
        vi.mocked(verifyToken).mockResolvedValue(mockNonAdminUser);

        const response = await PATCH(mockRequest("light"));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(403);
        expect(data.error).toBe("Admin privileges required");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("handles missing theme", async () => {
      const testTimer = measureTestTime("missing theme test");
      try {
        const response = await PATCH(mockRequest());
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(500);
        expect(data.error).toBe("Error updating login theme");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("handles invalid theme value", async () => {
      const testTimer = measureTestTime("invalid theme test");
      try {
        const response = await PATCH(mockRequest("invalid"));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data.error).toBe("Valid login theme (light or dark) is required");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    test("handles database error", async () => {
      const testTimer = measureTestTime("database error test");
      try {
        const dbError = new Error("Database error");
        vi.mocked(prisma.appConfig.upsert).mockRejectedValue(dbError);

        const response = await PATCH(mockRequest("light"));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(500);
        expect(data.error).toBe("Error updating login theme");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          upsert: vi.mocked(prisma.appConfig.upsert).mock.calls,
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
