import { GET } from "@/app/api/url-groups/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("URL Groups API", () => {
  const mockUser = {
    id: "user123",
    username: "testuser",
  };

  const mockUrlGroups = {
    userUrlGroups: [
      {
        urlGroup: {
          id: "group1",
          name: "Group 1",
          description: "Test group 1",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
          urls: [
            {
              url: {
                id: "url1",
                title: "URL 1",
                url: "https://example1.com",
                urlMobile: null,
                iconPath: "/icons/test1.png",
                idleTimeoutMinutes: 30,
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-02"),
              },
              displayOrder: 1,
            },
            {
              url: {
                id: "url2",
                title: "URL 2",
                url: "https://example2.com",
                urlMobile: "https://m.example2.com",
                iconPath: "/icons/test2.png",
                idleTimeoutMinutes: null,
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-02"),
              },
              displayOrder: 2,
            },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/url-groups", () => {
    it("should return transformed URL groups when authenticated", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue(mockUrlGroups);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        urlGroups: [
          {
            id: "group1",
            name: "Group 1",
            description: "Test group 1",
            createdAt: mockUrlGroups.userUrlGroups[0].urlGroup.createdAt.toISOString(),
            updatedAt: mockUrlGroups.userUrlGroups[0].urlGroup.updatedAt.toISOString(),
            urls: [
              {
                id: "url1",
                title: "URL 1",
                url: "https://example1.com",
                urlMobile: null,
                iconPath: "/icons/test1.png",
                idleTimeoutMinutes: 30,
                displayOrder: 1,
                createdAt: mockUrlGroups.userUrlGroups[0].urlGroup.urls[0].url.createdAt.toISOString(),
                updatedAt: mockUrlGroups.userUrlGroups[0].urlGroup.urls[0].url.updatedAt.toISOString(),
              },
              {
                id: "url2",
                title: "URL 2",
                url: "https://example2.com",
                urlMobile: "https://m.example2.com",
                iconPath: "/icons/test2.png",
                idleTimeoutMinutes: null,
                displayOrder: 2,
                createdAt: mockUrlGroups.userUrlGroups[0].urlGroup.urls[1].url.createdAt.toISOString(),
                updatedAt: mockUrlGroups.userUrlGroups[0].urlGroup.urls[1].url.updatedAt.toISOString(),
              },
            ],
          },
        ],
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          userUrlGroups: {
            select: {
              urlGroup: {
                include: {
                  urls: {
                    include: {
                      url: true,
                    },
                    orderBy: {
                      displayOrder: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      (verifyToken as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 when user not found", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should handle empty URL groups", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockResolvedValue({ userUrlGroups: [] });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ urlGroups: [] });
    });

    it("should handle internal server errors", async () => {
      (verifyToken as any).mockResolvedValue(mockUser);
      (prisma.user.findUnique as any).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});
