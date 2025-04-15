import type { Url, UrlGroup } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

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
import { POST as batchUpdateUrls } from "@/app/api/admin/url-groups/[id]/urls/batch/route";
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
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockUrlGroup: MockUrlGroup = {
    id: "group-id",
    name: "Test Group",
    description: "Test group description",
    createdAt: new Date("2025-03-30T05:03:18.240Z"),
    updatedAt: new Date("2025-03-30T05:03:18.240Z"),
    urls: [
      {
        url: {
          id: "url-id",
          title: "Test URL",
          url: "https://example.com",
          urlMobile: "https://m.example.com",
          iconPath: "/icons/test.png",
          idleTimeoutMinutes: 10,
          createdAt: new Date("2025-03-30T05:03:18.240Z"),
          updatedAt: new Date("2025-03-30T05:03:18.240Z"),
        },
        displayOrder: 1,
      },
    ],
  };

  const mockUrl: Url = {
    id: "url-id",
    title: "Test URL",
    url: "https://example.com",
    urlMobile: "https://m.example.com",
    iconPath: "/icons/test.png",
    idleTimeoutMinutes: 10,
    createdAt: new Date("2025-03-30T05:03:18.240Z"),
    updatedAt: new Date("2025-03-30T05:03:18.240Z"),
  };

  let mockCookieStore: {
    get: Mock;
    getAll: Mock;
    has: Mock;
    set: Mock;
    delete: Mock;
  };

  beforeEach(() => {
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
    Object.assign(prisma, {
      $transaction: vi.fn().mockImplementation((callback) => callback(prisma)),
      $queryRaw: vi.fn().mockResolvedValue([mockUrlGroup]),
      urlGroup: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(mockUrlGroup),
        create: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(null),
      },
      url: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(null),
      },
      urlsInGroups: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(null),
        createMany: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: 0 } }),
      },
      $disconnect: vi.fn(),
    });
  });

  describe("GET /api/admin/url-groups", () => {
    it("should return all URL groups when authenticated as admin", async () => {
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
      const data = await response.json();

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
    });

    it("should return 401 when not authenticated", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const response = await getUrlGroupsList();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when authenticated as non-admin", async () => {
      (verifyToken as any).mockResolvedValue({ ...mockAdminUser, isAdmin: false });

      const response = await getUrlGroupsList();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/admin/url-groups", () => {
    const mockCreateGroupRequest = {
      name: "New Group",
      description: "New group description",
    };

    it("should create a new URL group when authenticated as admin", async () => {
      (prisma.urlGroup.create as any).mockResolvedValue({
        id: "new-group-id",
        ...mockCreateGroupRequest,
        createdAt: mockUrlGroup.createdAt,
        updatedAt: mockUrlGroup.updatedAt,
      });

      const request = new NextRequest("http://localhost/api/admin/url-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockCreateGroupRequest),
      });

      const response = await createUrlGroup(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: "new-group-id",
        name: mockCreateGroupRequest.name,
        description: mockCreateGroupRequest.description,
      });
      expect(prisma.urlGroup.create).toHaveBeenCalledWith({
        data: mockCreateGroupRequest,
      });
    });

    it("should return 400 when name is missing", async () => {
      const request = new NextRequest("http://localhost/api/admin/url-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Test" }),
      });

      const response = await createUrlGroup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Group name is required");
    });
  });

  describe("GET /api/admin/url-groups/[id]", () => {
    it("should return URL group when authenticated as admin", async () => {
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
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockGroup);
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([]);

      const response = await getUrlGroup(new NextRequest("http://localhost"), {
        params: Promise.resolve({ id: mockUrlGroup.id }),
      } as RouteContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });

  describe("PUT /api/admin/url-groups/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };
    const mockUpdateRequest = {
      name: "Updated Group",
      description: "Updated description",
    };

    it("should update URL group when authenticated as admin", async () => {
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
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: mockUrlGroup.id,
        ...mockUpdateRequest,
      });
      expect(prisma.urlGroup.update).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
        data: mockUpdateRequest,
      });
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUpdateRequest),
      });

      const response = await updateUrlGroup(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });

  describe("DELETE /api/admin/url-groups/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };

    it("should delete URL group when authenticated as admin", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.urlGroup.delete as any).mockResolvedValue(mockUrlGroup);

      const response = await deleteUrlGroup(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.urlGroup.delete).toHaveBeenCalledWith({
        where: { id: mockUrlGroup.id },
      });
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const response = await deleteUrlGroup(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });

  describe("GET /api/admin/url-groups/[id]/urls", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };

    it("should return URLs in group when authenticated", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.$queryRaw as any).mockResolvedValue([
        {
          ...mockUrl,
          displayOrder: 1,
        },
      ]);

      const response = await getUrlsInGroup(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.urls).toEqual([
        {
          ...mockUrl,
          displayOrder: 1,
        },
      ]);
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const response = await getUrlsInGroup(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
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
      (prisma.urlGroup.findUnique as any).mockResolvedValue({
        ...mockUrlGroup,
        urls: [{ urlId: "url-1" }],
      });
      (prisma.urlsInGroups.aggregate as any).mockResolvedValue({ _count: 0 });

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlIds: mockUrlIds }),
      });

      const response = await updateUrlsInGroup(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.urlsInGroups.deleteMany).toHaveBeenCalledWith({
        where: { groupId: mockUrlGroup.id },
      });
      expect(prisma.urlsInGroups.createMany).toHaveBeenCalledWith({
        data: mockUrlIds.map((urlId) => ({
          groupId: mockUrlGroup.id,
          urlId,
        })),
      });
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

  describe("POST /api/admin/url-groups/[id]/urls/batch", () => {
    const mockProps = { params: Promise.resolve({ id: mockUrlGroup.id }) };

    it("should perform batch add operation when authenticated as admin", async () => {
      const mockUrlIds = ["url-1", "url-2"];
      (prisma.urlGroup.findUnique as any).mockResolvedValue(mockUrlGroup);
      (prisma.url.findMany as any).mockResolvedValue(mockUrlIds.map((id) => ({ id })));
      (prisma.urlsInGroups.aggregate as any).mockResolvedValue({ _count: 0 });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "add",
          urlIds: mockUrlIds,
        }),
      });

      const response = await batchUpdateUrls(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it("should return 400 for invalid operation type", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "invalid",
          urlIds: ["url-1"],
        }),
      });

      const response = await batchUpdateUrls(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid operation type");
    });

    it("should return 404 when URL group not found", async () => {
      (prisma.urlGroup.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "add",
          urlIds: ["url-1"],
        }),
      });

      const response = await batchUpdateUrls(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("URL group not found");
    });
  });
});
