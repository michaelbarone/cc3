/// <reference types="node" />
import { GET, PATCH } from "@/app/api/admin/app-config/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import {
  createMockUser,
  createTestAdmin,
  createTestAppConfig,
} from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import type { MakeDirectoryOptions, PathLike } from "fs";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Types for our test data
interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  loginTheme: "light" | "dark";
  registrationEnabled: boolean;
  favicon: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Add error response type for type safety
interface ErrorResponse {
  error: string;
}

interface RequestBody {
  appName?: string;
  loginTheme?: "light" | "dark";
  registrationEnabled?: boolean;
  appLogo?: string | null;
}

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Mock Prisma with direct mock object
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("fs", () => ({
  default: {
    mkdir: vi.fn(
      (
        path: PathLike,
        options: MakeDirectoryOptions | ((error: Error | null) => void),
        callback?: (error: Error | null) => void,
      ) => {
        if (typeof options === "function") {
          options(null);
        } else if (callback) {
          callback(null);
        }
      },
    ),
    writeFile: vi.fn((path: PathLike, data: any, callback: (error: Error | null) => void) => {
      callback(null);
    }),
    unlink: vi.fn((path: PathLike, callback: (error: Error | null) => void) => {
      callback(null);
    }),
  },
}));

vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
  join: (...args: string[]) => args.join("/"),
}));

describe("App Configuration API", () => {
  const suiteTimer = measureTestTime("App Config API Suite");
  const mockAdminToken = createTestAdmin();
  const mockNonAdminToken = createMockUser();
  const mockConfig = createTestAppConfig({
    id: "app-config",
    appName: "Control Center",
    appLogo: null,
    favicon: null,
    loginTheme: "dark",
    registrationEnabled: false,
    createdAt: "2025-04-16T23:07:40.232Z",
    updatedAt: "2025-04-16T23:07:40.232Z",
  });

  const mockRequest = (body: RequestBody) =>
    new NextRequest("http://localhost/api/admin/app-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.appConfig.findUnique), "appConfig.findUnique");
    debugMockCalls(vi.mocked(prisma.appConfig.create), "appConfig.create");
    debugMockCalls(vi.mocked(prisma.appConfig.update), "appConfig.update");
    debugMockCalls(vi.mocked(prisma.appConfig.upsert), "appConfig.upsert");
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/app-config", () => {
    it("should return existing app configuration", async () => {
      const testTimer = measureTestTime("get existing config test");
      try {
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockConfig);

        const response = await GET();
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(mockConfig);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should create and return default configuration when none exists", async () => {
      const testTimer = measureTestTime("create default config test");
      try {
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.appConfig.create).mockResolvedValue(mockConfig);

        const response = await GET();
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(mockConfig);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });

    it("should handle database errors gracefully", async () => {
      const testTimer = measureTestTime("database error test");
      try {
        vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(new Error("Database error"));

        const response = await GET();
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Error getting app config" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
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

  describe("PATCH /api/admin/app-config", () => {
    it("rejects update when not authenticated", async () => {
      const testTimer = measureTestTime("unauthorized update test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(null);

        const response = await PATCH(mockRequest({ appName: "New Name" }));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("rejects update when not admin", async () => {
      const testTimer = measureTestTime("non-admin update test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockNonAdminToken);

        const response = await PATCH(mockRequest({ appName: "New Name" }));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Admin privileges required" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("validates app name is not empty", async () => {
      const testTimer = measureTestTime("empty app name validation test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

        const response = await PATCH(mockRequest({ appName: "" }));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "App name cannot be empty" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("validates app name is not whitespace", async () => {
      const testTimer = measureTestTime("whitespace app name validation test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

        const response = await PATCH(mockRequest({ appName: "   " }));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "App name cannot be empty" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("handles database errors gracefully", async () => {
      const testTimer = measureTestTime("update database error test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        vi.mocked(prisma.appConfig.upsert).mockRejectedValue(new Error("Database error"));

        const response = await PATCH(mockRequest({ appName: "New Name" }));
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Error updating app config" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("handles invalid JSON in request body", async () => {
      const testTimer = measureTestTime("invalid json test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

        const response = await PATCH(
          new NextRequest("http://localhost/api/admin/app-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: "invalid json",
          }),
        );
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid request body" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("validates login theme", async () => {
      const testTimer = measureTestTime("login theme validation test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

        const response = await PATCH(
          mockRequest({
            loginTheme: "invalid" as any,
          }),
        );
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid theme value" });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("should update app name", async () => {
      const testTimer = measureTestTime("update app name test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        const updatedConfig = {
          ...mockConfig,
          appName: "New Control Center",
        };
        vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

        const response = await PATCH(mockRequest({ appName: "New Control Center" }));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(updatedConfig);
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          create: expect.any(Object),
          update: { appName: "New Control Center" },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("should update login theme", async () => {
      const testTimer = measureTestTime("update login theme test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        const updatedConfig = {
          ...mockConfig,
          loginTheme: "light",
        };
        vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

        const response = await PATCH(mockRequest({ loginTheme: "light" }));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(updatedConfig);
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          create: expect.any(Object),
          update: { loginTheme: "light" },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("should update registration enabled flag", async () => {
      const testTimer = measureTestTime("update registration enabled test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        const updatedConfig = {
          ...mockConfig,
          registrationEnabled: true,
        };
        vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

        const response = await PATCH(mockRequest({ registrationEnabled: true }));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(updatedConfig);
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          create: expect.any(Object),
          update: { registrationEnabled: true },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("should update multiple fields at once", async () => {
      const testTimer = measureTestTime("update multiple fields test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        const updatedConfig = {
          ...mockConfig,
          appName: "New Name",
          loginTheme: "light",
          registrationEnabled: true,
        };
        vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

        const response = await PATCH(
          mockRequest({
            appName: "New Name",
            loginTheme: "light",
            registrationEnabled: true,
          }),
        );
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toEqual(updatedConfig);
        expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
          where: { id: "app-config" },
          create: expect.any(Object),
          update: {
            appName: "New Name",
            loginTheme: "light",
            registrationEnabled: true,
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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

    it("should handle a case where no app configuration exists", async () => {
      const testTimer = measureTestTime("no config test");
      try {
        vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
        vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce({
          ...mockConfig,
          appName: "New Created Config",
        });

        const response = await PATCH(mockRequest({ appName: "New Created Config" }));
        const data = (await debugResponse(response)) as AppConfig;

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("appName", "New Created Config");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          verifyToken: vi.mocked(verifyToken).mock.calls,
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
