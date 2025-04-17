import {
  DELETE as deleteUser,
  GET as getUser,
  PUT as updateUser,
} from "@/app/api/admin/users/[id]/route";
import {
  GET as getUserUrlGroups,
  PUT as updateUserUrlGroups,
} from "@/app/api/admin/users/[id]/url-groups/route";
import { POST as createUser, GET as getUsersList } from "@/app/api/admin/users/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { hashPassword } from "@/app/lib/auth/password";
import { prisma } from "@/app/lib/db/prisma";
import { debugError, debugResponse, measureTestTime, THRESHOLDS } from "@/test/helpers/debug";
import { createMockAdminUser, createMockUser } from "@/test/mocks/factories";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, test, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userUrlGroup: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
    $disconnect: vi.fn(),
  },
}));

vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/auth/password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("next/headers");

// Response type definitions
interface UserResponse {
  id: string;
  username: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
}

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  success: boolean;
}

describe("Admin User Management API", () => {
  const suiteTimer = measureTestTime("Admin User Management Suite");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "mock_token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({
      id: "admin-id",
      username: "admin",
      isAdmin: true,
    });
  });

  afterAll(() => {
    suiteTimer.end();
  });

  test("returns users list for admin", async () => {
    const testTimer = measureTestTime("admin-users-list-test");
    try {
      const mockAdminUser = createMockAdminUser();
      const mockRegularUser = createMockUser();
      const mockUsers = [
        {
          ...mockAdminUser,
          lastLoginAt: new Date(),
          lastActiveUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          menuPosition: null,
          themeMode: null,
        },
        {
          ...mockRegularUser,
          lastLoginAt: new Date(),
          lastActiveUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          menuPosition: null,
          themeMode: null,
        },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

      const response = await getUsersList();
      const data = (await debugResponse(response)) as UserResponse[];

      // Transform dates to match API response format
      const expectedUsers = mockUsers.map((user) => ({
        ...user,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      expect(response.status).toBe(200);
      expect(data).toEqual(expectedUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { username: "asc" },
      });

      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } catch (error) {
      debugError(error as Error, {
        mockState: {
          verifyToken: vi.mocked(verifyToken).mock.calls,
          findMany: vi.mocked(prisma.user.findMany).mock.calls,
        },
      });
      throw error;
    } finally {
      testTimer.end();
    }
  });

  it("should return 401 when not authenticated", async () => {
    const testTimer = measureTestTime("unauth-users-test");
    try {
      // Override the default admin auth for this specific test
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await getUsersList();
      const data = (await debugResponse(response)) as ErrorResponse;

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");

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

  it("should return 403 when authenticated as non-admin", async () => {
    const testTimer = measureTestTime("forbidden-users-test");
    try {
      // Override the default admin auth for this specific test
      vi.mocked(verifyToken).mockResolvedValue(createMockUser());

      const response = await getUsersList();
      const data = (await debugResponse(response)) as ErrorResponse;

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");

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

  describe("POST /api/admin/users", () => {
    const mockCreateUserRequest = {
      username: "newuser",
      password: "password123",
      isAdmin: false,
    };

    it("should create a new user when authenticated as admin", async () => {
      const testTimer = measureTestTime("create-user-test");
      try {
        const hashedPassword = "hashed_password_123";
        vi.mocked(hashPassword).mockResolvedValue(hashedPassword);
        const newUser = createMockUser({
          id: "new-user-id",
          username: mockCreateUserRequest.username,
          isAdmin: mockCreateUserRequest.isAdmin,
          passwordHash: hashedPassword,
          lastLoginAt: null,
          lastActiveUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          menuPosition: null,
          themeMode: null,
        });
        vi.mocked(prisma.user.create).mockResolvedValue(newUser);

        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateUserRequest),
        });

        const response = await createUser(request);
        const data = (await debugResponse(response)) as UserResponse;

        expect(response.status).toBe(201);
        expect(data).toMatchObject({
          id: newUser.id,
          username: mockCreateUserRequest.username,
          isAdmin: mockCreateUserRequest.isAdmin,
        });
        expect(hashPassword).toHaveBeenCalledWith(mockCreateUserRequest.password);

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            hashPassword: vi.mocked(hashPassword).mock.calls,
            createUser: vi.mocked(prisma.user.create).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 400 when username is missing", async () => {
      const testTimer = measureTestTime("invalid-create-user-test");
      try {
        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "test123" }),
        });

        const response = await createUser(request);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(400);
        expect(data.error).toBe("Username is required");

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

    it("should return 409 when username already exists", async () => {
      const testTimer = measureTestTime("duplicate-user-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser());

        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateUserRequest),
        });

        const response = await createUser(request);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(409);
        expect(data.error).toBe("Username already exists");

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("GET /api/admin/users/[id]", () => {
    const mockUser = createMockUser();
    const mockProps = { params: Promise.resolve({ id: mockUser.id }) };

    it("should return user details when authenticated as admin", async () => {
      const testTimer = measureTestTime("get-user-details-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

        const response = await getUser(new NextRequest("http://localhost"), mockProps);
        const data = (await debugResponse(response)) as UserResponse;

        expect(response.status).toBe(200);
        expect(data).toEqual({
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
          lastLoginAt: mockUser.lastLoginAt?.toISOString() ?? null,
        });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockUser.id },
        });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user not found", async () => {
      const testTimer = measureTestTime("user-not-found-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await getUser(new NextRequest("http://localhost"), mockProps);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("PUT /api/admin/users/[id]", () => {
    const mockUser = createMockUser();
    const mockProps = { params: Promise.resolve({ id: mockUser.id }) };
    const mockUpdateRequest = {
      username: "updateduser",
      isAdmin: true,
      password: "newpassword",
    };

    it("should update user details when authenticated as admin", async () => {
      const testTimer = measureTestTime("update-user-test");
      try {
        const hashedPassword = "new_hashed_password";
        vi.mocked(hashPassword).mockResolvedValue(hashedPassword);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.user.update).mockResolvedValue({
          ...mockUser,
          username: mockUpdateRequest.username,
          isAdmin: mockUpdateRequest.isAdmin,
          passwordHash: hashedPassword,
        });

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockUpdateRequest),
        });

        const response = await updateUser(request, mockProps);
        const data = (await debugResponse(response)) as UserResponse;

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          id: mockUser.id,
          username: mockUpdateRequest.username,
          isAdmin: mockUpdateRequest.isAdmin,
        });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            hashPassword: vi.mocked(hashPassword).mock.calls,
            update: vi.mocked(prisma.user.update).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user not found", async () => {
      const testTimer = measureTestTime("update-user-not-found-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockUpdateRequest),
        });

        const response = await updateUser(request, mockProps);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("DELETE /api/admin/users/[id]", () => {
    const mockUser = createMockUser();
    const mockProps = { params: Promise.resolve({ id: mockUser.id }) };

    it("should delete user when authenticated as admin", async () => {
      const testTimer = measureTestTime("delete-user-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
        vi.mocked(prisma.user.delete).mockResolvedValue(mockUser);

        const response = await deleteUser(new NextRequest("http://localhost"), mockProps);
        const data = await debugResponse(response);

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            delete: vi.mocked(prisma.user.delete).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user not found", async () => {
      const testTimer = measureTestTime("delete-user-not-found-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const response = await deleteUser(new NextRequest("http://localhost"), mockProps);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("GET /api/admin/users/[id]/url-groups", () => {
    const mockUser = createMockUser();
    const mockProps = { params: Promise.resolve({ id: mockUser.id }) };
    const mockUrlGroups = [
      { id: "group1", name: "Group 1" },
      { id: "group2", name: "Group 2" },
    ];

    it("should return user's URL groups when authenticated as admin", async () => {
      const testTimer = measureTestTime("get-user-url-groups-test");
      try {
        vi.mocked(prisma.userUrlGroup.findMany).mockResolvedValue(
          mockUrlGroups.map((group) => ({
            userId: mockUser.id,
            urlGroupId: group.id,
            createdAt: new Date(),
            urlGroup: group,
          })),
        );

        const response = await getUserUrlGroups(new NextRequest("http://localhost"), mockProps);
        const data = (await debugResponse(response)) as typeof mockUrlGroups;

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUrlGroups);
        expect(prisma.userUrlGroup.findMany).toHaveBeenCalledWith({
          where: { userId: mockUser.id },
          include: { urlGroup: true },
        });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findMany: vi.mocked(prisma.userUrlGroup.findMany).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });

  describe("PUT /api/admin/users/[id]/url-groups", () => {
    const mockUser = createMockUser();
    const mockProps = { params: Promise.resolve({ id: mockUser.id }) };
    const mockUrlGroupIds = ["group1", "group2"];

    it("should update user's URL group assignments when authenticated as admin", async () => {
      const testTimer = measureTestTime("update-user-url-groups-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlGroupIds: mockUrlGroupIds }),
        });

        const response = await updateUserUrlGroups(request, mockProps);
        const data = (await debugResponse(response)) as SuccessResponse;

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(prisma.userUrlGroup.deleteMany).toHaveBeenCalledWith({
          where: { userId: mockUser.id },
        });
        expect(prisma.userUrlGroup.createMany).toHaveBeenCalledWith({
          data: mockUrlGroupIds.map((groupId) => ({
            userId: mockUser.id,
            urlGroupId: groupId,
          })),
        });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
            deleteMany: vi.mocked(prisma.userUrlGroup.deleteMany).mock.calls,
            createMany: vi.mocked(prisma.userUrlGroup.createMany).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });

    it("should return 404 when user not found", async () => {
      const testTimer = measureTestTime("update-url-groups-user-not-found-test");
      try {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const request = new NextRequest("http://localhost", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlGroupIds: mockUrlGroupIds }),
        });

        const response = await updateUserUrlGroups(request, mockProps);
        const data = (await debugResponse(response)) as ErrorResponse;

        expect(response.status).toBe(404);
        expect(data.error).toBe("User not found");

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
      } catch (error) {
        debugError(error as Error, {
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      } finally {
        testTimer.end();
      }
    });
  });
});
