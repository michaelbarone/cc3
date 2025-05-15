import { createTestUrl, createTestUrlGroup } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import type { Url, UrlGroup } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock modules first
vi.mock("@/app/lib/db/prisma");
vi.mock("@/app/lib/auth/jwt");
vi.mock("next/headers");

// Import mocked modules
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";

// Import the modules we want to test
import {
  DELETE as deleteUrlGroup,
  GET as getUrlGroup,
  PUT as updateUrlGroup,
} from "@/app/api/admin/url-groups/[id]/route";
import {
  POST as addUrlToGroup,
  GET as getUrlsInGroup,
  PUT as updateUrlsInGroup,
} from "@/app/api/admin/url-groups/[id]/urls/route";
import { POST as createUrlGroup, GET as getUrlGroupsList } from "@/app/api/admin/url-groups/route";

// Define types
type RouteContext = {
  params: Promise<{ id: string }>;
};

type SuccessResponse<T> = {
  status: number;
  data: T;
};

type ErrorResponse = {
  status: number;
  error: string;
};

type MockUrlGroup = UrlGroup & {
  urls?: Array<{
    url: Url;
    displayOrder: number;
  }>;
  urlCount?: number;
};

type MockPrismaClient = {
  urlGroup: {
    findMany: Mock;
    findUnique: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  urlsInGroups: {
    findMany: Mock;
    findUnique: Mock;
    create: Mock;
    createMany: Mock;
    deleteMany: Mock;
    updateMany: Mock;
    aggregate: Mock;
  };
  url: {
    findMany: Mock;
    findUnique: Mock;
    create: Mock;
  };
  $transaction: Mock;
  $queryRaw: Mock;
  $disconnect: Mock;
};

describe("Admin URL Group Management API", () => {
  const suiteTimer = measureTestTime("URL Group API Suite");

  // Mock data setup
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockDate = new Date("2025-01-01T00:00:00.000Z");
  const mockDateString = mockDate.toISOString();

  const mockUrlGroup = createTestUrlGroup({
    id: "test-group-id",
    name: "Test Group",
    description: "Test description",
    createdAt: mockDateString,
    updatedAt: mockDateString,
    urls: [
      {
        url: createTestUrl({
          id: "url-id",
          title: "Test URL",
          url: "https://example.com",
          urlMobile: "https://m.example.com",
          iconPath: "/icons/test.png",
          idleTimeoutMinutes: 10,
          createdAt: mockDateString,
          updatedAt: mockDateString,
        }),
        displayOrder: 1,
      },
    ],
  });

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

  let mockCookieStore: {
    get: Mock;
    getAll: Mock;
    has: Mock;
    set: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    const setupTimer = measureTestTime("Test Setup");
    try {
      vi.clearAllMocks();

      // Setup cookie mock
      mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: "valid_token" }),
        getAll: vi.fn(),
        has: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      (cookies as Mock).mockReturnValue(mockCookieStore);

      // Setup auth mock
      (verifyToken as Mock).mockResolvedValue(mockAdminUser);

      // Setup Prisma mock
      const prismaUrlGroup = {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(mockUrlGroup),
        create: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(null),
      };

      const prismaUrl = {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(null),
      };

      const prismaUrlsInGroups = {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(null),
        createMany: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: 0 } }),
      };

      Object.assign(prisma, {
        $transaction: vi.fn().mockImplementation((callback) => callback(prisma)),
        $queryRaw: vi.fn().mockResolvedValue([mockUrlGroup]),
        urlGroup: prismaUrlGroup,
        url: prismaUrl,
        urlsInGroups: prismaUrlsInGroups,
        $disconnect: vi.fn(),
      });
    } finally {
      setupTimer.end();
    }
  });

  afterEach(() => {
    const cleanupTimer = measureTestTime("Test Cleanup");
    try {
      debugMockCalls(verifyToken as Mock, "verifyToken");
      debugMockCalls(prisma.urlGroup.findMany as Mock, "prisma.urlGroup.findMany");
      debugMockCalls(prisma.urlGroup.findUnique as Mock, "prisma.urlGroup.findUnique");
      debugMockCalls(prisma.urlGroup.create as Mock, "prisma.urlGroup.create");
      debugMockCalls(prisma.urlGroup.update as Mock, "prisma.urlGroup.update");
      debugMockCalls(prisma.urlGroup.delete as Mock, "prisma.urlGroup.delete");
      debugMockCalls(prisma.url.findMany as Mock, "prisma.url.findMany");
      debugMockCalls(prisma.url.findUnique as Mock, "prisma.url.findUnique");
      debugMockCalls(prisma.url.create as Mock, "prisma.url.create");
      debugMockCalls(prisma.urlsInGroups.findMany as Mock, "prisma.urlsInGroups.findMany");
      debugMockCalls(prisma.urlsInGroups.findUnique as Mock, "prisma.urlsInGroups.findUnique");
      debugMockCalls(prisma.urlsInGroups.create as Mock, "prisma.urlsInGroups.create");
      debugMockCalls(prisma.urlsInGroups.createMany as Mock, "prisma.urlsInGroups.createMany");
      debugMockCalls(prisma.urlsInGroups.deleteMany as Mock, "prisma.urlsInGroups.deleteMany");
      debugMockCalls(prisma.urlsInGroups.updateMany as Mock, "prisma.urlsInGroups.updateMany");
      debugMockCalls(prisma.urlsInGroups.aggregate as Mock, "prisma.urlsInGroups.aggregate");
    } finally {
      cleanupTimer.end();
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("GET /api/admin/url-groups", () => {
    it("should return all URL groups when authenticated as admin", async () => {
      const testTimer = measureTestTime("Get URL Groups - Admin");
      try {
        const mockGroups = [
          {
            ...mockUrlGroup,
            urls: [
              {
                url: mockUrl,
                displayOrder: 1,
              },
            ],
            urlCount: 1,
          },
        ];

        (prisma.urlGroup.findMany as any).mockResolvedValue(mockGroups);

        const response = await getUrlGroupsList();
        const data = await debugResponse<SuccessResponse<MockUrlGroup[]>>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual(mockGroups);
        expect(prisma.urlGroup.findMany).toHaveBeenCalledWith({
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
          orderBy: {
            name: "asc",
          },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findMany: vi.mocked(prisma.urlGroup.findMany).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 401 when not authenticated", async () => {
      const testTimer = measureTestTime("Get URL Groups - Unauthorized");
      try {
        mockCookieStore.get.mockReturnValue(undefined);

        const response = await getUrlGroupsList();
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            cookieStore: mockCookieStore.get.mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const testTimer = measureTestTime("Get URL Groups - Forbidden");
      try {
        (verifyToken as any).mockResolvedValue({ ...mockAdminUser, isAdmin: false });

        const response = await getUrlGroupsList();
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            cookieStore: mockCookieStore.get.mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("POST /api/admin/url-groups", () => {
    const mockCreateGroupRequest = {
      name: "New Group",
      description: "New group description",
    };

    it("should create a new URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Create URL Group - Success");
      try {
        const mockNewGroup = createTestUrlGroup({
          id: "new-group-id",
          ...mockCreateGroupRequest,
          createdAt: mockDateString,
          updatedAt: mockDateString,
        });

        (prisma.urlGroup.create as any).mockResolvedValue(mockNewGroup);

        const request = new NextRequest("http://localhost/api/admin/url-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateGroupRequest),
        });

        const response = await createUrlGroup(request);
        const data = await debugResponse<SuccessResponse<typeof mockNewGroup>>(response);

        expect(response.status).toBe(201);
        expect(data).toMatchObject({
          id: "new-group-id",
          name: mockCreateGroupRequest.name,
          description: mockCreateGroupRequest.description,
        });
        expect(prisma.urlGroup.create).toHaveBeenCalledWith({
          data: mockCreateGroupRequest,
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            create: vi.mocked(prisma.urlGroup.create).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 400 when name is missing", async () => {
      const testTimer = measureTestTime("Create URL Group - Missing Name");
      try {
        const request = new NextRequest("http://localhost/api/admin/url-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "Test" }),
        });

        const response = await createUrlGroup(request);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Group name is required");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Get URL Group - Admin");
      try {
        const mockGroup = {
          ...mockUrlGroup,
          urls: [
            {
              url: mockUrl,
              displayOrder: 1,
            },
          ],
        };

        prisma.urlGroup.findUnique = vi.fn().mockResolvedValue(mockGroup) as any;

        const response = await getUrlGroup(new NextRequest("http://localhost"), {
          params: Promise.resolve({ id: mockGroup.id }),
        } as RouteContext);
        const data = await debugResponse<SuccessResponse<MockUrlGroup>>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual(mockGroup);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Get URL Group - Not Found");
      try {
        (prisma.$queryRaw as any).mockResolvedValue([]);

        const response = await getUrlGroup(new NextRequest("http://localhost"), {
          params: Promise.resolve({ id: mockUrlGroup.id }),
        } as RouteContext);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL group not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            queryRaw: vi.mocked(prisma.$queryRaw).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("PUT /api/admin/url-groups/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };
    const mockUpdateRequest = {
      name: "Updated Group",
      description: "Updated description",
    };

    it("should update URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Update URL Group - Success");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.update as any).mockResolvedValue({
          ...mockUrlGroup,
          ...mockUpdateRequest,
        });

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockUpdateRequest),
        });

        const response = await updateUrlGroup(request, mockProps);
        const data = await debugResponse<SuccessResponse<MockUrlGroup>>(response);

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          id: mockUrlGroup.id,
          ...mockUpdateRequest,
        });
        expect(prisma.urlGroup.update).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
          data: mockUpdateRequest,
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
            update: vi.mocked(prisma.urlGroup.update).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Update URL Group - Not Found");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockUpdateRequest),
        });

        const response = await updateUrlGroup(request, mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL group not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };

    it("should delete URL group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Delete URL Group - Success");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
        (prisma.urlGroup.delete as any).mockResolvedValue(mockUrlGroup);

        const response = await deleteUrlGroup(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<SuccessResponse<{ success: boolean }>>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(prisma.urlGroup.delete).toHaveBeenCalledWith({
          where: { id: mockUrlGroup.id },
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
            delete: vi.mocked(prisma.urlGroup.delete).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Delete URL Group - Not Found");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

        const response = await deleteUrlGroup(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL group not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("GET /api/admin/url-groups/[id]/urls", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };

    it("should return URLs in group when authenticated", async () => {
      const testTimer = measureTestTime("Get URLs in Group - Success");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue({
          ...mockUrlGroup,
          urls: [
            {
              url: mockUrl,
              displayOrder: 1,
            },
          ],
        });

        const response = await getUrlsInGroup(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<Array<Url & { displayOrder: number }>>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual([
          {
            ...mockUrl,
            displayOrder: 1,
          },
        ]);
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      const testTimer = measureTestTime("Get URLs in Group - Not Found");
      try {
        (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

        const response = await getUrlsInGroup(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse<ErrorResponse>(response);

        expect(response.status).toBe(404);
        expect(data.error).toBe("URL group not found");
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("POST /api/admin/url-groups/[id]/urls", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };
    const mockAddUrlRequest = {
      title: "New URL",
      url: "https://newexample.com",
      iconPath: "/icons/new.png",
      idleTimeoutMinutes: 15,
    };

    it("should add URL to group when authenticated as admin", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.url.create as any).mockResolvedValue({
        id: "new-url-id",
        ...mockAddUrlRequest,
      });
      (prisma.url.findMany as any).mockResolvedValue([]);
      (prisma.urlsInGroups.aggregate as any).mockResolvedValue({ _max: { displayOrder: 0 } });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockAddUrlRequest),
      });

      const response = await addUrlToGroup(request, mockProps, true);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: "new-url-id",
        ...mockAddUrlRequest,
      });
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockAddUrlRequest),
      });

      const response = await addUrlToGroup(request, mockProps, true);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });

  describe("PUT /api/admin/url-groups/[id]/urls", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };
    const mockUrlIds = ["url-1", "url-2"];

    it("should update URLs in group when authenticated as admin", async () => {
      const testTimer = measureTestTime("Update URLs in Group - Success");
      try {
        // Setup proper mocks
        (prisma.urlGroup.findUnique as any).mockResolvedValue({
          ...mockUrlGroup,
          urls: [{ urlId: "url-1" }],
        });

        // Mock transaction to return success
        (prisma.$transaction as any).mockImplementation(async (operations: any[]) => {
          // Execute all operations
          for (const operation of operations) {
            await operation;
          }
          return true;
        });

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlIds: mockUrlIds }),
        });

        const response = await updateUrlsInGroup(request, mockProps);
        const data = await debugResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.urlGroup.findUnique).mock.calls,
            transaction: vi.mocked(prisma.$transaction).mock.calls,
            deleteMany: vi.mocked(prisma.urlsInGroups.deleteMany).mock.calls,
            createMany: vi.mocked(prisma.urlsInGroups.createMany).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlIds: mockUrlIds }),
      });

      const response = await updateUrlsInGroup(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });
});
