import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    urlGroup: {
      findUnique: vi.fn(),
    },
    userUrlGroup: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("URL Group User Management API", () => {
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

  const mockUrlGroup = {
    id: "group-1",
    name: "Test Group",
  };

  const mockProps = {
    params: Promise.resolve({ id: mockUrlGroup.id }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/url-groups/[id]/users", () => {
    it("should return all users in the URL group when authenticated as admin", async () => {
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.userUrlGroup.findMany as any).mockResolvedValue([
        {
          user: {
            id: "user-1",
            username: "user1",
            isAdmin: false,
            avatarUrl: "/avatars/user1.webp",
          },
        },
        {
          user: {
            id: "user-2",
            username: "user2",
            isAdmin: true,
            avatarUrl: null,
          },
        },
      ]);

      const response = await GET(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([
        {
          id: "user-1",
          username: "user1",
          isAdmin: false,
          avatarUrl: "/avatars/user1.webp",
        },
        {
          id: "user-2",
          username: "user2",
          isAdmin: true,
          avatarUrl: null,
        },
      ]);
      expect(prisma.urlGroup.findUnique).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
      });
      expect(prisma.userUrlGroup.findMany).toHaveBeenCalledWith({
        where: { urlGroupId: mockUrlGroup.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isAdmin: true,
              avatarUrl: true,
            },
          },
        },
      });
    });

    it("should return 403 when not authenticated as admin", async () => {
      (verifyToken as any).mockResolvedValue(mockRegularUser);

      const response = await GET(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when URL group not found", async () => {
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const response = await GET(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });

  describe("PUT /api/admin/url-groups/[id]/users", () => {
    const mockUserIds = ["user-1", "user-2"];

    it("should update URL group users when authenticated as admin", async () => {
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.user.findMany as any).mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: mockUserIds }),
      });

      const response = await PUT(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.userUrlGroup.deleteMany).toHaveBeenCalledWith({
        where: { urlGroupId: mockUrlGroup.id },
      });
      expect(prisma.userUrlGroup.createMany).toHaveBeenCalledWith({
        data: mockUserIds.map((userId) => ({
          userId,
          urlGroupId: mockUrlGroup.id,
        })),
      });
    });

    it("should return 403 when not authenticated as admin", async () => {
      (verifyToken as any).mockResolvedValue(mockRegularUser);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: mockUserIds }),
      });

      const response = await PUT(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when URL group not found", async () => {
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: mockUserIds }),
      });

      const response = await PUT(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });

    it("should return 400 when one or more users not found", async () => {
      (verifyToken as any).mockResolvedValue(mockAdminUser);
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.user.findMany as any).mockResolvedValue([{ id: "user-1" }]); // Only one user found

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: mockUserIds }),
      });

      const response = await PUT(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("One or more users not found");
    });
  });
});
