/// <reference types="node" />
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

describe("Icon Management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup verifyToken mock
    vi.mocked(verifyToken).mockResolvedValue({ id: "admin-user", isAdmin: true });

    // Setup sharp mock
    vi.mocked(sharp).mockImplementation(
      () =>
        ({
          resize: vi.fn().mockReturnThis(),
          webp: vi.fn().mockReturnThis(),
          toFile: vi.fn().mockResolvedValue(undefined),
        }) as any,
    );

    // Setup fs mock
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
  });

  describe("POST /api/admin/icons", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

      const formData = new FormData();
      const file = new File(["test-image"], "test.png", { type: "image/png" });
      formData.append("icon", file);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(verifyToken).mockImplementationOnce(async () => ({
        id: "regular-user",
        isAdmin: false,
      }));

      const formData = new FormData();
      const file = new File(["test-image"], "test.png", { type: "image/png" });
      formData.append("icon", file);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("returns 400 when no icon file provided", async () => {
      const formData = new FormData();
      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 when file is too large", async () => {
      const formData = new FormData();
      const largeFile = new File(["x".repeat(5 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      });
      formData.append("icon", largeFile);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 when file is not an image", async () => {
      const formData = new FormData();
      const file = new File(["not-an-image"], "test.txt", { type: "text/plain" });
      formData.append("icon", file);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("successfully uploads and processes icon", async () => {
      const formData = new FormData();
      const file = new File(["test-image"], "test.png", { type: "image/png" });
      formData.append("icon", file);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("iconUrl");
      expect(data.iconUrl).toMatch(/^\/icons\/icon-\d+\.webp$/);

      // Verify file operations
      expect(vi.mocked(fs.mkdir)).toHaveBeenCalled();
      expect(vi.mocked(sharp)).toHaveBeenCalled();
    });

    it("handles file system errors gracefully", async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error("File system error"));

      const formData = new FormData();
      const file = new File(["test-image"], "test.png", { type: "image/png" });
      formData.append("icon", file);

      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/admin/icons", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockRejectedValueOnce(new Error("Unauthorized"));

      const request = new NextRequest(
        "http://localhost:3000/api/admin/icons?iconPath=/icons/test.webp",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(verifyToken).mockImplementationOnce(async () => ({
        id: "regular-user",
        isAdmin: false,
      }));

      const request = new NextRequest(
        "http://localhost:3000/api/admin/icons?iconPath=/icons/test.webp",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it("returns 400 when no icon path provided", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/icons", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    it("successfully deletes icon file", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/admin/icons?iconPath=/icons/test.webp",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(200);

      // Verify file operations
      expect(vi.mocked(fs.access)).toHaveBeenCalled();
      expect(vi.mocked(fs.unlink)).toHaveBeenCalled();
    });

    it("handles non-existent file gracefully", async () => {
      const error = Object.assign(new Error("File not found"), { code: "ENOENT" });
      vi.mocked(fs.access).mockRejectedValueOnce(error);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/icons?iconPath=/icons/test.webp",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(404);
    });

    it("handles file system errors gracefully", async () => {
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("File system error"));

      const request = new NextRequest(
        "http://localhost:3000/api/admin/icons?iconPath=/icons/test.webp",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(500);
    });
  });
});
