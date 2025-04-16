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
import { createTestTimer, debugResponse } from "@/test/utils/helpers/debug";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Factory functions for test data
const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  username: "testuser",
  isAdmin: false,
  passwordHash: "hashed_password",
  ...overrides,
});

const createMockUrlGroup = (overrides = {}) => ({
  id: "test-group-id",
  name: "Test Group",
  description: "Test Description",
  ...overrides,
});

describe("Admin User Management API", () => {
  const mockAdminUser = createMockUser({ id: "admin-id", username: "admin", isAdmin: true });
  const mockRegularUser = createMockUser({ id: "user-id", username: "testuser" });
  const timer = createTestTimer();

  beforeEach(() => {
    vi.clearAllMocks();
    timer.reset();
    mockCookieStore.get.mockReturnValue({ value: "valid_token" });
    (verifyToken as any).mockResolvedValue(mockAdminUser);
  });

  describe("GET /api/admin/users", () => {
    it("should return all users when authenticated as admin", async () => {
      timer.start("get-users-test");
      try {
        const mockUsers = [mockAdminUser, mockRegularUser];
        (prisma.user.findMany as any).mockResolvedValue(mockUsers);

        const response = await getUsersList();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockUsers);
        expect(prisma.user.findMany).toHaveBeenCalledWith({
          orderBy: { username: "asc" },
        });

        timer.end("get-users-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findMany: vi.mocked(prisma.user.findMany).mock.calls,
          },
        });
        throw error;
      }
    });

    it("should return 401 when not authenticated", async () => {
      timer.start("unauth-users-test");
      try {
        mockCookieStore.get.mockReturnValue(undefined);
        (verifyToken as any).mockResolvedValue(null);

        const response = await getUsersList();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");

        timer.end("unauth-users-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            cookies: mockCookieStore.get.mock.calls,
          },
        });
        throw error;
      }
    });

    it("should return 403 when authenticated as non-admin", async () => {
      timer.start("forbidden-users-test");
      try {
        (verifyToken as any).mockResolvedValue({ ...mockRegularUser });

        const response = await getUsersList();
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");

        timer.end("forbidden-users-test");
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
  });

  describe("POST /api/admin/users", () => {
    const mockCreateUserRequest = {
      username: "newuser",
      password: "password123",
      isAdmin: false,
    };

    it("should create a new user when authenticated as admin", async () => {
      timer.start("create-user-test");
      try {
        const hashedPassword = "hashed_password_123";
        (hashPassword as any).mockResolvedValue(hashedPassword);
        const newUser = createMockUser({
          id: "new-user-id",
          username: mockCreateUserRequest.username,
          isAdmin: mockCreateUserRequest.isAdmin,
          passwordHash: hashedPassword,
        });
        (prisma.user.create as any).mockResolvedValue(newUser);

        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateUserRequest),
        });

        const response = await createUser(request);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toMatchObject({
          id: newUser.id,
          username: mockCreateUserRequest.username,
          isAdmin: mockCreateUserRequest.isAdmin,
        });
        expect(hashPassword).toHaveBeenCalledWith(mockCreateUserRequest.password);

        timer.end("create-user-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            hashPassword: vi.mocked(hashPassword).mock.calls,
            createUser: vi.mocked(prisma.user.create).mock.calls,
          },
        });
        throw error;
      }
    });

    it("should return 400 when username is missing", async () => {
      timer.start("invalid-create-user-test");
      try {
        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "test123" }),
        });

        const response = await createUser(request);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Username is required");

        timer.end("invalid-create-user-test");
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

    it("should return 409 when username already exists", async () => {
      timer.start("duplicate-user-test");
      try {
        (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);

        const request = new NextRequest("http://localhost/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockCreateUserRequest),
        });

        const response = await createUser(request);
        await debugResponse(response);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe("Username already exists");

        timer.end("duplicate-user-test");
      } catch (error) {
        console.error("Test failed:", {
          error,
          mockState: {
            verifyToken: vi.mocked(verifyToken).mock.calls,
            findUnique: vi.mocked(prisma.user.findUnique).mock.calls,
          },
        });
        throw error;
      }
    });
  });

  describe("GET /api/admin/users/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockRegularUser.id }) };

    it("should return user details when authenticated as admin", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);

      const response = await getUser(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockRegularUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockRegularUser.id },
      });
    });

    it("should return 404 when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await getUser(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("PUT /api/admin/users/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockRegularUser.id }) };
    const mockUpdateRequest = {
      username: "updateduser",
      isAdmin: true,
      password: "newpassword",
    };

    it("should update user details when authenticated as admin", async () => {
      const hashedPassword = "new_hashed_password";
      (hashPassword as any).mockResolvedValue(hashedPassword);
      (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.update as any).mockResolvedValue({
        ...mockRegularUser,
        ...mockUpdateRequest,
        passwordHash: hashedPassword,
      });

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUpdateRequest),
      });

      const response = await updateUser(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: mockRegularUser.id,
        username: mockUpdateRequest.username,
        isAdmin: mockUpdateRequest.isAdmin,
      });
      expect(hashPassword).toHaveBeenCalledWith(mockUpdateRequest.password);
    });

    it("should return 404 when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUpdateRequest),
      });

      const response = await updateUser(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("DELETE /api/admin/users/[id]", () => {
    const mockProps = { params: Promise.resolve({ id: mockRegularUser.id }) };

    it("should delete user when authenticated as admin", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);
      (prisma.user.delete as any).mockResolvedValue(mockRegularUser);

      const response = await deleteUser(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockRegularUser.id },
      });
    });

    it("should return 404 when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await deleteUser(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/admin/users/[id]/url-groups", () => {
    const mockProps = { params: Promise.resolve({ id: mockRegularUser.id }) };
    const mockUrlGroups = [
      { id: "group1", name: "Group 1" },
      { id: "group2", name: "Group 2" },
    ];

    it("should return user's URL groups when authenticated as admin", async () => {
      (prisma.userUrlGroup.findMany as any).mockResolvedValue(
        mockUrlGroups.map((group) => ({
          urlGroup: group,
        })),
      );

      const response = await getUserUrlGroups(new NextRequest("http://localhost"), mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUrlGroups);
      expect(prisma.userUrlGroup.findMany).toHaveBeenCalledWith({
        where: { userId: mockRegularUser.id },
        include: { urlGroup: true },
      });
    });
  });

  describe("PUT /api/admin/users/[id]/url-groups", () => {
    const mockProps = { params: Promise.resolve({ id: mockRegularUser.id }) };
    const mockUrlGroupIds = ["group1", "group2"];

    it("should update user's URL group assignments when authenticated as admin", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlGroupIds: mockUrlGroupIds }),
      });

      const response = await updateUserUrlGroups(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.userUrlGroup.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockRegularUser.id },
      });
      expect(prisma.userUrlGroup.createMany).toHaveBeenCalledWith({
        data: mockUrlGroupIds.map((groupId) => ({
          userId: mockRegularUser.id,
          urlGroupId: groupId,
        })),
      });
    });

    it("should return 404 when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlGroupIds: mockUrlGroupIds }),
      });

      const response = await updateUserUrlGroups(request, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });
});
