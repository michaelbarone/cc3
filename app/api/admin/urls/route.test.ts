import {
  DELETE as deleteUrl,
  GET as getUrl,
  PUT as updateUrl,
} from "@/app/api/admin/urls/[id]/route";
import { POST as createUrl, GET as getUrlsList } from "@/app/api/admin/urls/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { createTestUrl } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

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

// Types for response data
type UrlResponse = {
  id: string;
  title: string;
  url: string;
  urlMobile?: string | null;
  iconPath?: string | null;
  idleTimeoutMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
};

type ErrorResponse = {
  error: string;
};

describe("Admin URL Management API", () => {
  const suiteTimer = measureTestTime("Admin URL API Suite");

  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockDate = new Date("2025-03-30T05:03:18.240Z");
  const mockDateString = mockDate.toISOString();

  const mockUrl = createTestUrl({
    id: "url-id",
    title: "Test URL",
    url: "https://example.com",
    urlMobile: "https://m.example.com",
    iconPath: "/icons/test.png",
    idleTimeoutMinutes: 10,
    createdAt: mockDateString,
    updatedAt: mockDateString,
  });

  beforeEach(() => {
    const setupTimer = measureTestTime("Test Setup");
    try {
      vi.clearAllMocks();
      mockCookieStore.get.mockReturnValue({ value: "valid_token" });
      (verifyToken as Mock).mockResolvedValue(mockAdminUser);
    } finally {
      setupTimer.end();
    }
  });

  afterEach(() => {
    const cleanupTimer = measureTestTime("Test Cleanup");
    try {
      debugMockCalls(verifyToken as Mock, "verifyToken");
      debugMockCalls(prisma.url.findMany as Mock, "prisma.url.findMany");
      debugMockCalls(prisma.url.findUnique as Mock, "prisma.url.findUnique");
      debugMockCalls(prisma.url.create as Mock, "prisma.url.create");
      debugMockCalls(prisma.url.update as Mock, "prisma.url.update");
      debugMockCalls(prisma.url.delete as Mock, "prisma.url.delete");
    } finally {
      cleanupTimer.end();
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/urls", () => {
    it("should return all URLs when authenticated as admin", async () => {
      const testTimer = measureTestTime("Get URLs - Admin");
      try {
        const mockUrls = [mockUrl];
        (prisma.url.findMany as Mock).mockResolvedValue(mockUrls);

        const response = await getUrlsList();
        const data = await debugResponse<UrlResponse[]>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrls);
        expect(prisma.url.findMany).toHaveBeenCalledWith({
          orderBy: { title: "asc" },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findMany: (prisma.url.findMany as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when not authenticated", async () => {
      const testTimer = measureTestTime("Get URLs - Unauthorized");
      try {
        mockCookieStore.get.mockReturnValue(undefined);

        const response = await getUrlsList();
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("Get URLs - Forbidden");
      try {
        (verifyToken as Mock).mockResolvedValue({ ...mockAdminUser, isAdmin: false });

        const response = await getUrlsList();
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
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
      const testTimer = measureTestTime("Create URL - Success");
      try {
        const mockNewUrl = createTestUrl({
          id: "new-url-id",
          title: mockCreateUrlRequest.title,
          url: mockCreateUrlRequest.url,
          urlMobile: mockCreateUrlRequest.urlMobile,
          iconPath: mockCreateUrlRequest.iconPath,
          idleTimeoutMinutes: mockCreateUrlRequest.idleTimeout,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        (prisma.url.create as Mock).mockResolvedValue(mockNewUrl);

        const request = new NextRequest("http://localhost/api/admin/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateUrlRequest),
        });

        const response = await createUrl(request);
        const data = await debugResponse<UrlResponse>(response);

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
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            create: (prisma.url.create as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 400 when title is missing", async () => {
      const testTimer = measureTestTime("Create URL - Missing Title");
      try {
        const request = new NextRequest("http://localhost/api/admin/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...mockCreateUrlRequest, title: "" }),
        });

        const response = await createUrl(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Title is required");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 400 when URL is missing", async () => {
      const testTimer = measureTestTime("Create URL - Missing URL");
      try {
        const request = new NextRequest("http://localhost/api/admin/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...mockCreateUrlRequest, url: "" }),
        });

        const response = await createUrl(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("URL is required");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("GET /api/admin/urls/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrl.id }) };

    it("should return URL details when authenticated", async () => {
      const testTimer = measureTestTime("Get URL Detail - Success");
      try {
        (prisma.url.findUnique as Mock).mockResolvedValue(mockUrl);

        const response = await getUrl(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<UrlResponse>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrl);
        expect(prisma.url.findUnique).toHaveBeenCalledWith({
          where: { id: mockUrl.id },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.url.findUnique as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL not found", async () => {
      const testTimer = measureTestTime("Get URL Detail - Not Found");
      try {
        (prisma.url.findUnique as Mock).mockResolvedValue(null);

        const response = await getUrl(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.url.findUnique as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
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
      const testTimer = measureTestTime("Update URL - Success");
      try {
        (prisma.url.findUnique as Mock).mockResolvedValue(mockUrl);
        (prisma.url.update as Mock).mockResolvedValue({
          ...mockUrl,
          ...mockUpdateRequest,
        });

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockUpdateRequest),
        });

        const response = await updateUrl(request, mockProps);
        const data = await debugResponse<UrlResponse>(response);

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          id: mockUrl.id,
          ...mockUpdateRequest,
        });
        expect(prisma.url.update).toHaveBeenCalledWith({
          where: { id: mockUrl.id },
          data: mockUpdateRequest,
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.url.findUnique as Mock).mock.calls,
            update: (prisma.url.update as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should validate idle timeout value", async () => {
      const testTimer = measureTestTime("Update URL - Invalid Timeout");
      try {
        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...mockUpdateRequest, idleTimeoutMinutes: -1 }),
        });

        const response = await updateUrl(request, mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Idle timeout must be a non-negative number");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/urls/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrl.id }) };

    it("should delete URL when authenticated as admin", async () => {
      const testTimer = measureTestTime("Delete URL - Success");
      try {
        (prisma.url.findUnique as Mock).mockResolvedValue(mockUrl);
        (prisma.url.delete as Mock).mockResolvedValue(mockUrl);
        (prisma.urlsInGroups.findMany as Mock).mockResolvedValue([]);

        const response = await deleteUrl(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse(response);

        expect(response.status).toBe(200);
        expect(data).toMatchObject({ success: true });
        expect(prisma.url.delete).toHaveBeenCalledWith({ where: { id: mockUrl.id } });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.url.findUnique as Mock).mock.calls,
            delete: (prisma.url.delete as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL not found", async () => {
      const testTimer = measureTestTime("Delete URL - Not Found");
      try {
        (prisma.url.findUnique as Mock).mockResolvedValue(null);

        const response = await deleteUrl(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            findUnique: (prisma.url.findUnique as Mock).mock.calls,
          },
          performanceMetrics: {
            elapsed: testTimer.elapsed(),
            threshold: THRESHOLDS.API,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
