import { POST } from "@/app/api/users/last-active-url/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    url: {
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

describe("Last Active URL API", () => {
  const mockUser = {
    id: "user123",
    username: "testuser",
  };

  const mockUrl = {
    id: "url123",
    title: "Test URL",
    url: "https://example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/users/last-active-url", () => {
    it("should update last active URL when authenticated and URL exists", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.url.findUnique as any).mockResolvedValue(mockUrl);
      (prisma.user.update as any).mockResolvedValue({ ...mockUser, lastActiveUrl: mockUrl.id });

      const request = new Request("http://localhost/api/users/last-active-url", {
        method: "POST",
        body: JSON.stringify({ urlId: mockUrl.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.url.findUnique).toHaveBeenCalledWith({
        where: { id: mockUrl.id },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastActiveUrl: mockUrl.id },
      });
    });

    it("should return 401 when not authenticated", async () => {
      (verifyToken as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/users/last-active-url", {
        method: "POST",
        body: JSON.stringify({ urlId: mockUrl.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 400 when URL ID is missing", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/users/last-active-url", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "URL ID is required" });
    });

    it("should return 404 when URL does not exist", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.url.findUnique as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/users/last-active-url", {
        method: "POST",
        body: JSON.stringify({ urlId: "nonexistent" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL not found" });
    });

    it("should handle internal server errors", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.url.findUnique as any).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/users/last-active-url", {
        method: "POST",
        body: JSON.stringify({ urlId: mockUrl.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});
