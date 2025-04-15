import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtPayload, verifyToken } from "../../../../lib/auth/jwt";
import { prisma } from "../../../../lib/db/prisma";
import { DELETE, GET, PUT } from "./route";
import { createMockNextRequest } from "@/test/utils/mocks/next";

// Create a proper mock for ReadonlyRequestCookies
const createMockCookies = (authToken?: string): ReadonlyRequestCookies => {
  const cookieMap = new Map();
  if (authToken) {
    cookieMap.set("auth_token", { name: "auth_token", value: authToken });
  }
  const entries = Array.from(cookieMap.entries());
  return {
    get: (name: string) => cookieMap.get(name),
    getAll: () => Array.from(cookieMap.values()),
    has: (name: string) => cookieMap.has(name),
    size: cookieMap.size,
    [Symbol.iterator]: function* () {
      for (const entry of entries) {
        yield entry;
      }
    },
  } as unknown as ReadonlyRequestCookies;
};

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("../../../../lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    urlGroup: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("URL Group API", () => {
  const mockDate = new Date("2025-03-31T05:40:32.156Z");
  const mockDateString = mockDate.toISOString();

  const mockUrlGroup = {
    id: "123",
    name: "Test Group",
    description: "Test Description",
    createdAt: mockDate,
    updatedAt: mockDate,
    urls: [
      {
        id: "456",
        title: "Test URL",
        url: "https://example.com",
        displayOrder: 1,
        iconPath: null,
        idleTimeoutMinutes: null,
      },
    ],
  };

  const mockUrlGroupResponse = {
    ...mockUrlGroup,
    createdAt: mockDateString,
    updatedAt: mockDateString,
  };

  const mockProps = {
    params: { id: mockUrlGroup.id },
  };

  const mockAdminUser = {
    id: "789",
    username: "admin",
    email: "admin@example.com",
    isAdmin: true,
  };

  const mockNonAdminUser = {
    id: "012",
    username: "user",
    email: "user@example.com",
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up admin token for admin tests
    vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies("admin_token")));

    vi.mocked(verifyToken).mockImplementation(async (): Promise<JwtPayload | null> => {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;
      if (token === "admin_token") {
        return {
          id: "1",
          username: "admin",
          isAdmin: true,
        };
      } else if (token === "user_token") {
        return {
          id: "2",
          username: "user",
          isAdmin: false,
        };
      }
      return null;
    });
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([mockUrlGroupResponse]);

      const response = await GET(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUrlGroupResponse);
    });

    it("should return 401 when no token is present", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies()));

      const response = await GET(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies("user_token")));

      const response = await GET(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

      const response = await GET(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("Database error"));

      const response = await GET(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("PUT /api/admin/url-groups/[id]", () => {
    const updateData = {
      name: "Updated Group",
      description: "Updated Description",
    };

    it("should update URL group when authenticated as admin", async () => {
      const updatedUrlGroup = {
        ...mockUrlGroup,
        ...updateData,
      };

      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.update).mockResolvedValueOnce(updatedUrlGroup);

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        ...mockUrlGroupResponse,
        ...updateData,
      });
      expect(prisma.urlGroup.update).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
        data: updateData,
      });
    });

    it("should return 401 when no token is present", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies()));

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies("user_token")));

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(null);

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify({ description: "Test Description" }),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Group name is required" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.update).mockRejectedValueOnce(new Error("Database error"));

      const response = await PUT(
        createMockNextRequest("http://localhost/api/admin/url-groups/123", {
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    it("should delete URL group when authenticated as admin", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.delete).mockResolvedValueOnce(mockUrlGroup);

      const response = await DELETE(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.urlGroup.delete).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
      });
    });

    it("should return 401 when no token is present", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies()));

      const response = await DELETE(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Override the cookie mock for this test
      vi.mocked(cookies).mockReturnValue(Promise.resolve(createMockCookies("user_token")));

      const response = await DELETE(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(null);

      const response = await DELETE(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.delete).mockRejectedValueOnce(new Error("Database error"));

      const response = await DELETE(
        createMockNextRequest("http://localhost/api/admin/url-groups/123"),
        { params: { id: "123" } },
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });
});
