import { POST } from "@/app/api/first-run/restore/route";
import { restoreBackup } from "@/app/lib/archive/archive";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { expectApiResponse, TypeValidator, validators } from "@/test/helpers/type-validation";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock("@/app/lib/archive/archive", () => ({
  restoreBackup: vi.fn(),
}));

vi.mock("fs/promises", () => {
  return {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    default: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    },
  };
});

vi.mock("path", () => {
  return {
    join: vi.fn(),
    default: {
      join: vi.fn(),
    },
  };
});

// Define response type validators
const errorResponseValidator: TypeValidator<{ error: string }> = validators.object({
  error: validators.string,
});

const successResponseValidator: TypeValidator<{ success: boolean }> = validators.object({
  success: validators.boolean,
});

// Mock user template
const createMockUser = (overrides = {}) => ({
  id: "1",
  username: "testuser",
  passwordHash: "hash",
  isAdmin: true,
  lastActiveUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  avatarUrl: null,
  menuPosition: null,
  themeMode: null,
  ...overrides,
});

describe("First Run Restore API", () => {
  // Shared setup for all tests
  beforeAll(async () => {
    const setupTimer = measureTestTime("Test Suite Setup");
    try {
      // Initialize any shared resources
    } finally {
      setupTimer.end();
    }
  });

  beforeEach(async () => {
    const setupTimer = measureTestTime("Test Setup");
    try {
      vi.clearAllMocks();
      // Reset mock implementations
      (fs.mkdir as Mock).mockResolvedValue(undefined);
      (fs.writeFile as Mock).mockResolvedValue(undefined);
      (fs.unlink as Mock).mockResolvedValue(undefined);
      (path.join as Mock).mockImplementation((...args) => args.join("/"));
      (restoreBackup as Mock).mockResolvedValue(undefined);
    } finally {
      setupTimer.end();
    }
  });

  afterEach(async () => {
    const cleanupTimer = measureTestTime("Test Cleanup");
    try {
      // Cleanup any resources
    } finally {
      cleanupTimer.end();
    }
  });

  describe("POST /api/first-run/restore", () => {
    const mockFile = new File(["test"], "backup.zip", { type: "application/zip" });
    const mockFormData = new FormData();
    mockFormData.append("backup", mockFile);

    it("restores backup during first run", async () => {
      const testTimer = measureTestTime("restore-backup");
      try {
        // Mock an admin user who has never logged in (first run state)
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
        ]);

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        // Validate response structure
        expectApiResponse(data, successResponseValidator, "POST 200 response");
        expect(restoreBackup).toHaveBeenCalled();
        expect(fs.unlink).toHaveBeenCalled(); // Verify cleanup
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 403 when not in first run state", async () => {
      const testTimer = measureTestTime("not-first-run-check");
      try {
        // Mock an admin user who has logged in before (not first run)
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: new Date() }),
        ]);

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Restore is only available during first run" });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 403 response");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 403 when multiple admin users exist", async () => {
      const testTimer = measureTestTime("multiple-admins-check");
      try {
        // Mock multiple admin users (not first run)
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ id: "1", lastLoginAt: null }),
          createMockUser({ id: "2", lastLoginAt: null }),
        ]);

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Restore is only available during first run" });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 403 response");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 when no backup file provided", async () => {
      const testTimer = measureTestTime("no-backup-check");
      try {
        // Mock first run state
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
        ]);

        const emptyFormData = new FormData();
        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: emptyFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "No backup file provided" });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 400 response");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 for invalid file type", async () => {
      const testTimer = measureTestTime("invalid-file-type-check");
      try {
        // Mock first run state
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
        ]);

        const invalidFile = new File(["test"], "backup.txt", { type: "text/plain" });
        const invalidFormData = new FormData();
        invalidFormData.append("backup", invalidFile);

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: invalidFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid file type. Please upload a .zip file" });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 400 response");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles restore errors gracefully", async () => {
      const testTimer = measureTestTime("restore-error-check");
      try {
        // Mock first run state
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
        ]);

        // Mock restore failure
        (restoreBackup as Mock).mockRejectedValueOnce(new Error("Restore failed"));

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({
          error: "Restore failed",
        });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 400 response - restore error");
        expect(fs.unlink).toHaveBeenCalled(); // Verify cleanup still happens
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles database errors gracefully", async () => {
      const testTimer = measureTestTime("database-error-check");
      try {
        // Mock database error
        (prisma.user.findMany as Mock).mockRejectedValueOnce(new Error("Database error"));

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(500);
        expect(data).toEqual({
          error: "Database error",
        });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 500 response - database error");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime("filesystem-error-check");
      try {
        // Mock first run state
        (prisma.user.findMany as Mock).mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
        ]);

        // Mock file system error
        (fs.writeFile as Mock).mockRejectedValueOnce(new Error("Write error"));

        const request = new NextRequest("http://localhost/api/first-run/restore", {
          method: "POST",
          body: mockFormData,
        });

        const response = await POST(request);
        const data = await debugResponse(response);

        expect(response.status).toBe(400);
        expect(data).toEqual({
          error: "Write error",
        });
        // Validate response structure
        expectApiResponse(data, errorResponseValidator, "POST 400 response - filesystem error");
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
