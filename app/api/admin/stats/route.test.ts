// 1. External imports
import { beforeEach, describe, expect, it, vi } from "vitest";

// 2. Internal imports
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";

// 3. Test subject import
import { GET } from "@/app/api/admin/stats/route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
    },
    urlGroup: {
      count: vi.fn(),
    },
    url: {
      count: vi.fn(),
    },
  },
}));

describe("Admin Stats API", () => {
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockRegularUser = {
    id: "user-id",
    username: "testuser",
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/stats", () => {
    it("should return stats when authenticated as admin", async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

      // Mock database counts
      vi.mocked(prisma.user.count).mockResolvedValue(10);
      vi.mocked(prisma.urlGroup.count).mockResolvedValue(5);
      vi.mocked(prisma.url.count).mockResolvedValue(25);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalUsers: 10,
        totalUrlGroups: 5,
        totalUrls: 25,
      });

      // Verify database calls
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.urlGroup.count).toHaveBeenCalled();
      expect(prisma.url.count).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });

      // Verify no database calls were made
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(prisma.urlGroup.count).not.toHaveBeenCalled();
      expect(prisma.url.count).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockRegularUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });

      // Verify no database calls were made
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(prisma.urlGroup.count).not.toHaveBeenCalled();
      expect(prisma.url.count).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.user.count).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });
});
