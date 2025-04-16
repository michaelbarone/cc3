import { MockNextRequest, createMockCookieStore, mockNextHeaders } from "@/test/utils/mocks/next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtPayload, verifyToken } from "../../../../lib/auth/jwt";
import { prisma } from "../../../../lib/db/prisma";
import { DELETE, GET, PUT } from "./route";

// Debug helpers
const debugResponse = async (response: Response) => {
  const clone = response.clone();
  const body = await clone.text();
  console.log("Response:", {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: body.length > 0 ? JSON.parse(body) : null,
  });
};

const measureTestTime = async (name: string, fn: () => Promise<void>) => {
  const start = performance.now();
  try {
    await fn();
  } finally {
    const end = performance.now();
    console.log(`Test "${name}" took ${Math.round(end - start)}ms`);
  }
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

describe("URL Group API", () => {
  const mockDate = new Date("2025-03-31T05:40:32.156Z");
  const mockDateString = mockDate.toISOString();

  // Factory function for test data
  const createMockUrlGroup = (overrides = {}) => ({
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
    ...overrides,
  });

  const mockUrlGroup = createMockUrlGroup();
  const mockUrlGroupResponse = {
    ...mockUrlGroup,
    createdAt: mockDateString,
    updatedAt: mockDateString,
  };

  // Helper to create request with params in URL
  const createRequest = (method: string = "GET", body?: any) => {
    const url = new URL("http://localhost/api/admin/url-groups/123");
    const init = body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { method };
    return {
      request: new MockNextRequest(url.toString(), init),
      params: Promise.resolve({ id: "123" }),
    };
  };

  let cookieStore: ReturnType<typeof createMockCookieStore>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up cookie store mock
    cookieStore = createMockCookieStore();
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "auth_token") {
        return { value: "admin_token" };
      }
      return undefined;
    });

    // Set up headers mock with cookie store
    mockNextHeaders(cookieStore);

    vi.mocked(verifyToken).mockImplementation(
      async (token?: string): Promise<JwtPayload | null> => {
        if (!token) return null;
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
      },
    );
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
      await measureTestTime("GET URL group - admin success", async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([mockUrlGroupResponse]);

        const { request, params } = createRequest();
        const response = await GET(request, { params });
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrlGroupResponse);
      });
    });

    it("should return 401 when no token is present", async () => {
      cookieStore.get.mockReturnValue(undefined);

      const { request, params } = createRequest();
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      // Override the cookie mock for this test
      cookieStore.get.mockReturnValue({ value: "user_token" });

      const { request, params } = createRequest();
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

      const { request, params } = createRequest();
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
    });

    it("should handle database errors gracefully", async () => {
      await measureTestTime("GET URL group - database error", async () => {
        const dbError = new Error("Database error");
        vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(dbError);

        const { request, params } = createRequest();
        const response = await GET(request, { params });
        await debugResponse(response);
        const data = await response.json();

        console.error("Database operation failed:", {
          error: dbError.message,
          stack: dbError.stack,
        });

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Internal Server Error" });
      });
    });
  });

  describe("PUT /api/admin/url-groups/[id]", () => {
    const createUpdateData = (overrides = {}) => ({
      name: "Updated Group",
      description: "Updated Description",
      ...overrides,
    });

    it("should update URL group when authenticated as admin", async () => {
      await measureTestTime("PUT URL group - admin success", async () => {
        const updateData = createUpdateData();
        const updatedUrlGroup = createMockUrlGroup(updateData);

        vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
        vi.mocked(prisma.urlGroup.update).mockResolvedValueOnce(updatedUrlGroup);

        const { request, params } = createRequest("PUT", updateData);
        const response = await PUT(request, { params });
        await debugResponse(response);
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
    });

    it("should return 401 when no token is present", async () => {
      cookieStore.get.mockReturnValue(undefined);

      const { request, params } = createRequest("PUT", createUpdateData());
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      cookieStore.get.mockReturnValue({ value: "user_token" });

      const { request, params } = createRequest("PUT", createUpdateData());
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(null);

      const { request, params } = createRequest("PUT", createUpdateData());
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);

      const { request, params } = createRequest("PUT", { description: "Test Description" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Group name is required" });
      expect(prisma.urlGroup.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.update).mockRejectedValueOnce(new Error("Database error"));

      const { request, params } = createRequest("PUT", createUpdateData());
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    it("should delete URL group when authenticated as admin", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.delete).mockResolvedValueOnce(mockUrlGroup);

      const { request, params } = createRequest("DELETE");
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.urlGroup.delete).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
      });
    });

    it("should return 401 when no token is present", async () => {
      cookieStore.get.mockReturnValue(undefined);

      const { request, params } = createRequest("DELETE");
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should return 403 when authenticated as non-admin", async () => {
      cookieStore.get.mockReturnValue({ value: "user_token" });

      const { request, params } = createRequest("DELETE");
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Forbidden" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when URL group not found", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(null);

      const { request, params } = createRequest("DELETE");
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "URL group not found" });
      expect(prisma.urlGroup.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.urlGroup.findUnique).mockResolvedValueOnce(mockUrlGroup);
      vi.mocked(prisma.urlGroup.delete).mockRejectedValueOnce(new Error("Database error"));

      const { request, params } = createRequest("DELETE");
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal Server Error" });
    });
  });
});
