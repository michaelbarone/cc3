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

describe("Admin User Management API", () => {
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockRegularUser = {
    id: "user-id",
    username: "testuser",
    isAdmin: false,
    passwordHash: "hashed_password",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: "valid_token" });
    (verifyToken as any).mockResolvedValue(mockAdminUser);
  });

  describe("GET /api/admin/users", () => {
    it("should return all users when authenticated as admin", async () => {
      const mockUsers = [mockAdminUser, mockRegularUser];
      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      const response = await getUsersList();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { username: "asc" },
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      (verifyToken as any).mockResolvedValue(null);

      const response = await getUsersList();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when authenticated as non-admin", async () => {
      (verifyToken as any).mockResolvedValue({ ...mockRegularUser });

      const response = await getUsersList();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/admin/users", () => {
    const mockCreateUserRequest = {
      username: "newuser",
      password: "password123",
      isAdmin: false,
    };

    it("should create a new user when authenticated as admin", async () => {
      const hashedPassword = "hashed_password_123";
      (hashPassword as any).mockResolvedValue(hashedPassword);
      (prisma.user.create as any).mockResolvedValue({
        id: "new-user-id",
        ...mockCreateUserRequest,
        passwordHash: hashedPassword,
      });

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockCreateUserRequest),
      });

      const response = await createUser(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: "new-user-id",
        username: mockCreateUserRequest.username,
        isAdmin: mockCreateUserRequest.isAdmin,
      });
      expect(hashPassword).toHaveBeenCalledWith(mockCreateUserRequest.password);
    });

    it("should return 400 when username is missing", async () => {
      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test123" }),
      });

      const response = await createUser(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username is required");
    });

    it("should return 409 when username already exists", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockRegularUser);

      const request = new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockCreateUserRequest),
      });

      const response = await createUser(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Username already exists");
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
