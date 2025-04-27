/// <reference types="node" />

// External dependencies first
import fs from "fs/promises";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Internal dependencies
import { DELETE, POST } from "@/app/api/admin/icons/route";
import { JwtPayload, verifyToken } from "@/app/lib/auth/jwt";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { createTestFileBlob } from "@/test/mocks/factories/file.factory";

// Type definitions
type IconResponse = {
  iconUrl: string;
};

type ErrorResponse = {
  error: string;
};

// Mock modules
vi.mock("@/app/lib/auth/jwt", () => {
  const verifyToken = vi.fn();
  return { verifyToken };
});

vi.mock("sharp", () => {
  const sharp = vi.fn();
  return { default: sharp };
});

vi.mock("fs/promises", () => {
  const fsMock = {
    mkdir: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
  };
  return {
    default: fsMock,
    ...fsMock,
  };
});

// Factory functions for test data
const createMockIconFile = (content = "test-image", name = "test.png") =>
  createTestFileBlob(name, "image/png", content);

const createIconRequest = (file?: File, method = "POST") => {
  const formData = new FormData();
  if (file) formData.append("icon", file);
  return new NextRequest("http://localhost:3000/api/admin/icons", {
    method,
    body: formData,
  });
};

describe("Icon Management API", () => {
  const suiteTimer = measureTestTime("Icon Management API Suite");

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup verifyToken mock with admin user by default
    vi.mocked(verifyToken).mockResolvedValue({
      id: "admin-user-id",
      username: "admin",
      email: "admin@example.com",
      name: "Admin User",
      isAdmin: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as JwtPayload);

    // Setup sharp mock with chainable methods
    vi.mocked(sharp).mockImplementation(
      () =>
        ({
          resize: vi.fn().mockReturnThis(),
          webp: vi.fn().mockReturnThis(),
          toFile: vi.fn().mockResolvedValue(undefined),
        }) as any,
    );

    // Setup fs mock with successful operations by default
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Debug mock states after each test
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(fs.mkdir), "fs.mkdir");
    debugMockCalls(vi.mocked(fs.access), "fs.access");
    debugMockCalls(vi.mocked(fs.unlink), "fs.unlink");
    debugMockCalls(vi.mocked(sharp), "sharp");
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("POST /api/admin/icons", () => {
    it("returns 401 when not authenticated", async () => {
      const testTimer = measureTestTime("unauthorized POST test");
      try {
        vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

        const request = createIconRequest(createMockIconFile());
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 403 when not admin", async () => {
      const testTimer = measureTestTime("non-admin POST test");
      try {
        vi.mocked(verifyToken).mockImplementationOnce(
          async () =>
            ({
              id: "regular-user-id",
              username: "user",
              email: "user@example.com",
              name: "Regular User",
              isAdmin: false,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            }) as JwtPayload,
        );

        const request = createIconRequest(createMockIconFile());
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(403);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 when no icon file provided", async () => {
      const testTimer = measureTestTime("missing file POST test");
      try {
        const request = createIconRequest();
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 when file is too large", async () => {
      const testTimer = measureTestTime("large file POST test");
      try {
        // Create a large string that will exceed the size limit when converted to a buffer
        const largeContent = "x".repeat(5 * 1024 * 1024 + 1);
        const largeFile = createTestFileBlob("large.png", "image/png", largeContent);
        const request = createIconRequest(largeFile);
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 when file is not an image", async () => {
      const testTimer = measureTestTime("invalid file type POST test");
      try {
        const nonImageFile = createTestFileBlob("test.txt", "text/plain", "not-an-image");
        const request = createIconRequest(nonImageFile);
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("successfully uploads and processes icon", async () => {
      const testTimer = measureTestTime("successful POST test");
      try {
        const request = createIconRequest(createMockIconFile());
        const response = await POST(request);
        const data = await debugResponse<IconResponse>(response);

        expect(response.status).toBe(200);
        expect(data.iconUrl).toMatch(/^\/icons\/icon-\d+\.webp$/);

        // Verify file operations
        expect(vi.mocked(fs.mkdir)).toHaveBeenCalled();
        expect(vi.mocked(sharp)).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime("file system error POST test");
      try {
        vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error("File system error"));

        const request = createIconRequest(createMockIconFile());
        const response = await POST(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/icons", () => {
    const createDeleteRequest = (iconPath?: string) => {
      const url = iconPath
        ? `http://localhost:3000/api/admin/icons?iconPath=${iconPath}`
        : "http://localhost:3000/api/admin/icons";
      return new NextRequest(url, { method: "DELETE" });
    };

    it("returns 401 when not authenticated", async () => {
      const testTimer = measureTestTime("unauthorized DELETE test");
      try {
        vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

        const request = createDeleteRequest("/icons/test.webp");
        const response = await DELETE(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 403 when not admin", async () => {
      const testTimer = measureTestTime("non-admin DELETE test");
      try {
        vi.mocked(verifyToken).mockImplementationOnce(
          async () =>
            ({
              id: "regular-user-id",
              username: "user",
              email: "user@example.com",
              name: "Regular User",
              isAdmin: false,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            }) as JwtPayload,
        );

        const request = createDeleteRequest("/icons/test.webp");
        const response = await DELETE(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(403);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("returns 400 when no icon path provided", async () => {
      const testTimer = measureTestTime("missing path DELETE test");
      try {
        const request = createDeleteRequest();
        const response = await DELETE(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("successfully deletes icon file", async () => {
      const testTimer = measureTestTime("successful DELETE test");
      try {
        const request = createDeleteRequest("/icons/test.webp");
        const response = await DELETE(request);
        const data = await debugResponse<IconResponse>(response);

        expect(response.status).toBe(200);
        expect(vi.mocked(fs.access)).toHaveBeenCalled();
        expect(vi.mocked(fs.unlink)).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles non-existent file gracefully", async () => {
      const testTimer = measureTestTime("non-existent file DELETE test");
      try {
        const error = Object.assign(new Error("File not found"), { code: "ENOENT" });
        vi.mocked(fs.access).mockRejectedValueOnce(error);

        const request = createDeleteRequest("/icons/test.webp");
        const response = await DELETE(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime("file system error DELETE test");
      try {
        vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));

        const request = createDeleteRequest("/icons/test.webp");
        const response = await DELETE(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error);
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
