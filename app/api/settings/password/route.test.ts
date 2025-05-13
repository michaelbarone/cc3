import { verifyToken } from "@/app/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/app/lib/auth/password";
import { db } from "@/app/lib/db";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

describe("Password Settings API", () => {
  const mockUser = {
    id: "user-1",
    username: "testuser",
    passwordHash: "current-hash",
    isAdmin: false,
    lastActiveUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    avatarUrl: null,
    menuPosition: null,
    themeMode: null,
  };

  const mockToken = {
    id: "user-1",
    username: "testuser",
    isAdmin: false,
  };

  const mockUserWithoutPassword = {
    id: "user-2",
    username: "nopassword",
    passwordHash: null,
  };

  const mockRequest = (body: any) =>
    new NextRequest("http://localhost/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT /api/settings/password", () => {
    it("updates password when authenticated and current password is correct", async () => {
      // Mock dependencies
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(hashPassword).mockResolvedValueOnce("new-hash");
      vi.mocked(db.user.update).mockResolvedValueOnce({ ...mockUser, passwordHash: "new-hash" });

      const response = await PUT(
        mockRequest({
          currentPassword: "current-password",
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: "Password updated successfully",
        hasPassword: true,
      });
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "new-hash" },
      });
    });

    it("removes password when newPassword is null", async () => {
      // Mock dependencies
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(db.user.update).mockResolvedValueOnce({ ...mockUser, passwordHash: null });

      const response = await PUT(
        mockRequest({
          currentPassword: "current-password",
          newPassword: null,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: "Password protection disabled successfully",
        hasPassword: false,
      });
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: null },
      });
    });

    it("rejects update when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null);

      const response = await PUT(
        mockRequest({
          currentPassword: "current-password",
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ message: "Unauthorized" });
    });

    it("rejects update when user not found", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);

      const response = await PUT(
        mockRequest({
          currentPassword: "current-password",
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ message: "User not found" });
    });

    it("rejects update when current password is incorrect", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const response = await PUT(
        mockRequest({
          currentPassword: "wrong-password",
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ message: "Current password is incorrect" });
    });

    it("allows setting initial password when user has no password", async () => {
      const userWithoutPassword = { ...mockUser, passwordHash: null };
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(userWithoutPassword);
      vi.mocked(hashPassword).mockResolvedValueOnce("new-hash");
      vi.mocked(db.user.update).mockResolvedValueOnce({
        ...userWithoutPassword,
        passwordHash: "new-hash",
      });

      const response = await PUT(
        mockRequest({
          currentPassword: null,
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: "Password updated successfully",
        hasPassword: true,
      });
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "new-hash" },
      });
    });

    it("handles database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockToken);
      vi.mocked(db.user.findUnique).mockRejectedValueOnce(new Error("Database error"));

      const response = await PUT(
        mockRequest({
          currentPassword: "current-password",
          newPassword: "new-password",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ message: "Internal server error" });
    });
  });
});
