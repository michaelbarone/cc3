/// <reference types="node" />
import { JwtPayload } from "@/app/lib/auth/jwt";
import { debugResponse, measureTestTime } from "@/test/utils/helpers/debug";
import { createTestFile } from "@/test/utils/mocks/file-mock";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Import modules after mocking
import { DELETE, POST } from "@/app/api/admin/icons/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import fs from "fs/promises";
import sharp from "sharp";

// Factory functions for test data
const createMockIconFile = (content = "test-image", name = "test.png") =>
  createTestFile(name, "image/png", Buffer.from(content).length);

const createIconRequest = (file?: File, method = "POST") => {
  const formData = new FormData();
  if (file) formData.append("icon", file);
  return new NextRequest("http://localhost:3000/api/admin/icons", {
    method,
    body: formData,
  });
};

describe("Icon Management API", () => {
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

  describe("POST /api/admin/icons", () => {
    it("returns 401 when not authenticated", async () => {
      const testTimer = measureTestTime();
      vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = createIconRequest(createMockIconFile());
      const response = await POST(request);

      debugResponse(response);
      expect(response.status).toBe(401);
      testTimer.end();
    });

    it("returns 403 when not admin", async () => {
      const testTimer = measureTestTime();
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

      debugResponse(response);
      expect(response.status).toBe(403);
      testTimer.end();
    });

    it("returns 400 when no icon file provided", async () => {
      const testTimer = measureTestTime();
      const request = createIconRequest();
      const response = await POST(request);

      debugResponse(response);
      expect(response.status).toBe(400);
      testTimer.end();
    });

    it("returns 400 when file is too large", async () => {
      const testTimer = measureTestTime();
      const largeContent = "x".repeat(5 * 1024 * 1024 + 1);
      const largeFile = createTestFile("large.png", "image/png", Buffer.from(largeContent).length);
      const request = createIconRequest(largeFile);
      const response = await POST(request);

      debugResponse(response);
      expect(response.status).toBe(400);
      testTimer.end();
    });

    it("returns 400 when file is not an image", async () => {
      const testTimer = measureTestTime();
      const nonImageFile = createTestFile(
        "test.txt",
        "text/plain",
        Buffer.from("not-an-image").length,
      );
      const request = createIconRequest(nonImageFile);
      const response = await POST(request);

      debugResponse(response);
      expect(response.status).toBe(400);
      testTimer.end();
    });

    it("successfully uploads and processes icon", async () => {
      const testTimer = measureTestTime();
      const request = createIconRequest(createMockIconFile());
      const response = await POST(request);
      const data = await response.json();

      debugResponse(response);
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("iconUrl");
      expect(data.iconUrl).toMatch(/^\/icons\/icon-\d+\.webp$/);

      // Verify file operations
      expect(vi.mocked(fs.mkdir)).toHaveBeenCalled();
      expect(vi.mocked(sharp)).toHaveBeenCalled();
      testTimer.end();
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime();
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error("File system error"));

      const request = createIconRequest(createMockIconFile());
      const response = await POST(request);

      debugResponse(response);
      expect(response.status).toBe(500);
      testTimer.end();
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
      const testTimer = measureTestTime();
      vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = createDeleteRequest("/icons/test.webp");
      const response = await DELETE(request);

      debugResponse(response);
      expect(response.status).toBe(401);
      testTimer.end();
    });

    it("returns 403 when not admin", async () => {
      const testTimer = measureTestTime();
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

      debugResponse(response);
      expect(response.status).toBe(403);
      testTimer.end();
    });

    it("returns 400 when no icon path provided", async () => {
      const testTimer = measureTestTime();
      const request = createDeleteRequest();
      const response = await DELETE(request);

      debugResponse(response);
      expect(response.status).toBe(400);
      testTimer.end();
    });

    it("successfully deletes icon file", async () => {
      const testTimer = measureTestTime();
      const request = createDeleteRequest("/icons/test.webp");
      const response = await DELETE(request);

      debugResponse(response);
      expect(response.status).toBe(200);
      expect(vi.mocked(fs.access)).toHaveBeenCalled();
      expect(vi.mocked(fs.unlink)).toHaveBeenCalled();
      testTimer.end();
    });

    it("handles non-existent file gracefully", async () => {
      const testTimer = measureTestTime();
      const error = Object.assign(new Error("File not found"), { code: "ENOENT" });
      vi.mocked(fs.access).mockRejectedValueOnce(error);

      const request = createDeleteRequest("/icons/test.webp");
      const response = await DELETE(request);

      debugResponse(response);
      expect(response.status).toBe(404);
      testTimer.end();
    });

    it("handles file system errors gracefully", async () => {
      const testTimer = measureTestTime();
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));

      const request = createDeleteRequest("/icons/test.webp");
      const response = await DELETE(request);

      debugResponse(response);
      expect(response.status).toBe(500);
      testTimer.end();
    });
  });
});
