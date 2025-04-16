// 1. External imports
import { beforeEach, describe, expect, it, vi } from "vitest";

// 2. Internal imports
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createTestTimer, debugResponse } from "@/test/utils/helpers/debug";

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

// Test data factory functions
const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  username: "testuser",
  isAdmin: false,
  ...overrides,
});

const createMockStats = (overrides = {}) => ({
  totalUsers: 10,
  totalUrlGroups: 5,
  totalUrls: 25,
  ...overrides,
});

describe("Admin Stats API", () => {
  const mockAdminUser = createMockUser({ id: "admin-id", username: "admin", isAdmin: true });
  const mockRegularUser = createMockUser({ id: "user-id", username: "testuser" });
  const timer = createTestTimer();

  beforeEach(() => {
    vi.clearAllMocks();
    timer.reset();
  });

  describe("GET /api/admin/stats", () => {
    it("should return stats when authenticated as admin", async () => {
      timer.start("admin-stats-test");

      try {
        // Mock authentication
        vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);

        // Mock database counts
        const mockStats = createMockStats();
        vi.mocked(prisma.user.count).mockResolvedValue(mockStats.totalUsers);
        vi.mocked(prisma.urlGroup.count).mockResolvedValue(mockStats.totalUrlGroups);
        vi.mocked(prisma.url.count).mockResolvedValue(mockStats.totalUrls);

        const response = await GET();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockStats);

        // Verify database calls
        expect(prisma.user.count).toHaveBeenCalled();
        expect(prisma.urlGroup.count).toHaveBeenCalled();
        expect(prisma.url.count).toHaveBeenCalled();

        timer.end("admin-stats-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            userCount: vi.mocked(prisma.user.count).mock.calls,
            urlGroupCount: vi.mocked(prisma.urlGroup.count).mock.calls,
            urlCount: vi.mocked(prisma.url.count).mock.calls,
          },
        });
        throw error;
      }
    });

    it("should return 401 when not authenticated", async () => {
      timer.start("unauth-stats-test");

      try {
        vi.mocked(verifyToken).mockResolvedValue(null);

        const response = await GET();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({ error: "Unauthorized" });

        // Verify no database calls were made
        expect(prisma.user.count).not.toHaveBeenCalled();
        expect(prisma.urlGroup.count).not.toHaveBeenCalled();
        expect(prisma.url.count).not.toHaveBeenCalled();

        timer.end("unauth-stats-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      timer.start("forbidden-stats-test");

      try {
        vi.mocked(verifyToken).mockResolvedValue(mockRegularUser);

        const response = await GET();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data).toEqual({ error: "Forbidden" });

        // Verify no database calls were made
        expect(prisma.user.count).not.toHaveBeenCalled();
        expect(prisma.urlGroup.count).not.toHaveBeenCalled();
        expect(prisma.url.count).not.toHaveBeenCalled();

        timer.end("forbidden-stats-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      }
    });

    it("should handle database errors gracefully", async () => {
      timer.start("db-error-stats-test");

      try {
        vi.mocked(verifyToken).mockResolvedValue(mockAdminUser);
        const dbError = new Error("Database error");
        vi.mocked(prisma.user.count).mockRejectedValue(dbError);

        const response = await GET();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });

        timer.end("db-error-stats-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            userCount: vi.mocked(prisma.user.count).mock.calls,
          },
        });
        throw error;
      }
    });
  });
});
