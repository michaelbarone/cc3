import {
  DELETE as deleteUrl,
  GET as getUrl,
  PUT as updateUrl,
} from "@/app/api/admin/urls/[id]/route";
import { POST as createUrl, GET as getUrlsList } from "@/app/api/admin/urls/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    unlink: vi.fn(),
  },
}));

// Mock dependencies
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    url: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    urlsInGroups: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
    $disconnect: vi.fn(),
  },
}));

vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

// Mock cookie store
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

describe("Admin URL Management API", () => {
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockUrl = {
    id: "url-id",
    title: "Test URL",
    url: "https://example.com",
    urlMobile: "https://m.example.com",
    iconPath: "/icons/test.png",
    idleTimeoutMinutes: 10,
    createdAt: "2025-03-30T05:03:18.240Z",
    updatedAt: "2025-03-30T05:03:18.240Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: "valid_token" });
    (verifyToken as any).mockResolvedValue(mockAdminUser);
  });

  describe("GET /api/admin/urls", () => {
    it("should return all URLs when authenticated as admin", async () => {
      const mockUrls = [mockUrl];
      (prisma.url.findMany as any).mockResolvedValue(mockUrls);

      const response = await getUrlsList();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUrls);
      expect(prisma.url.findMany).toHaveBeenCalledWith({
        orderBy: { title: "asc" },
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const response = await getUrlsList();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when authenticated as non-admin", async () => {
      (verifyToken as any).mockResolvedValue({ ...mockAdminUser, isAdmin: false });

      const response = await getUrlsList();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/admin/urls", () => {
    const mockCreateUrlRequest = {
      title: "New URL",
      url: "https://newexample.com",
      urlMobile: "https://m.newexample.com",
      iconPath: "/icons/new.png",
      idleTimeout: 15,
    };

    it("should create a new URL when authenticated as admin", async () => {
      (prisma.url.create as any).mockResolvedValue({
        id: "new-url-id",
        ...mockCreateUrlRequest,
        idleTimeoutMinutes: mockCreateUrlRequest.idleTimeout,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost/api/admin/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockCreateUrlRequest),
      });

      const response = await createUrl(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: "new-url-id",
        title: mockCreateUrlRequest.title,
        url: mockCreateUrlRequest.url,
      });
      expect(prisma.url.create).toHaveBeenCalledWith({
        data: {
          title: mockCreateUrlRequest.title,
          url: mockCreateUrlRequest.url,
          urlMobile: mockCreateUrlRequest.urlMobile,
          iconPath: mockCreateUrlRequest.iconPath,
          idleTimeoutMinutes: mockCreateUrlRequest.idleTimeout,
        },
      });
    });

    it("should return 400 when title is missing", async () => {
      const request = new NextRequest("http://localhost/api/admin/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mockCreateUrlRequest, title: "" }),
      });

      const response = await createUrl(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title is required");
    });

    it("should return 400 when URL is missing", async () => {
      const request = new NextRequest("http://localhost/api/admin/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mockCreateUrlRequest, url: "" }),
      });

      const response = await createUrl(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("URL is required");
    });
  });

  describe("GET /api/admin/urls/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrl.id }) };

    it("should return URL details when authenticated", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(mockUrl);

      const response = await getUrl(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUrl);
      expect(prisma.url.findUnique).toHaveBeenCalledWith({
        where: { id: mockUrl.id },
      });
    });

    it("should return 404 when URL not found", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(null);

      const response = await getUrl(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL not found");
    });
  });

  describe("PUT /api/admin/urls/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrl.id }) };
    const mockUpdateRequest = {
      title: "Updated URL",
      url: "https://updated.com",
      urlMobile: "https://m.updated.com",
      iconPath: "/icons/updated.png",
      idleTimeoutMinutes: 20,
    };

    it("should update URL details when authenticated as admin", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(mockUrl);
      (prisma.url.update as any).mockResolvedValue({
        ...mockUrl,
        ...mockUpdateRequest,
      });

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUpdateRequest),
      });

      const response = await updateUrl(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: mockUrl.id,
        ...mockUpdateRequest,
      });
      expect(prisma.url.update).toHaveBeenCalledWith({
        where: { id: mockUrl.id },
        data: mockUpdateRequest,
      });
    });

    it("should return 404 when URL not found", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUpdateRequest),
      });

      const response = await updateUrl(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL not found");
    });

    it("should validate idle timeout value", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(mockUrl);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mockUpdateRequest, idleTimeoutMinutes: -1 }),
      });

      const response = await updateUrl(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Idle timeout must be a non-negative number");
    });
  });

  describe("DELETE /api/admin/urls/[id]", () => {
    const mockProps = { params: { id: mockUrl.id } };

    it("should delete URL when authenticated as admin", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(mockUrl);
      (prisma.url.delete as any).mockResolvedValue(mockUrl);
      (prisma.urlsInGroups.findMany as any).mockResolvedValue([]);

      const response = await deleteUrl(new NextRequest("http://localhost"), mockProps, true);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.url.delete).toHaveBeenCalledWith({
        where: { id: mockUrl.id },
      });
    });

    it("should return 404 when URL not found", async () => {
      (prisma.url.findUnique as any).mockResolvedValue(null);

      const response = await deleteUrl(new NextRequest("http://localhost"), mockProps, true);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL not found");
    });
  });
});
