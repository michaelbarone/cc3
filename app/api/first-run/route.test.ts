import { GET as getFirstRunStatus } from "@/app/api/auth/first-run/route";
import { POST as restoreBackup } from "@/app/api/first-run/restore/route";
import { prisma } from "@/app/lib/db/prisma";
import { restoreBackup as restoreBackupUtil } from "@/lib/archive";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));
vi.mock("@/lib/archive");
vi.mock("fs/promises");
vi.mock("path");

// Mock user template
const createMockUser = (overrides = {}) => ({
  id: "1",
  username: "testuser",
  passwordHash: "hash",
  isAdmin: true,
  lastActiveUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  avatarUrl: null,
  menuPosition: null,
  themeMode: null,
  ...overrides,
});

describe("First Run API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock path.join to return predictable paths
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
  });

  describe("GET /api/auth/first-run", () => {
    it("returns true when exactly one admin user exists who has never logged in", async () => {
      const mockFindMany = vi.fn().mockResolvedValueOnce([createMockUser({ lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const response = await getFirstRunStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ isFirstRun: true });
    });

    it("returns false when admin user has logged in", async () => {
      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([createMockUser({ lastLoginAt: new Date() })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const response = await getFirstRunStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ isFirstRun: false });
    });

    it("returns false when multiple users exist", async () => {
      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([
          createMockUser({ lastLoginAt: null }),
          createMockUser({ id: "2", isAdmin: false, lastLoginAt: null }),
        ]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const response = await getFirstRunStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ isFirstRun: false });
    });

    it("returns false when no admin users exist", async () => {
      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([createMockUser({ isAdmin: false, lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const response = await getFirstRunStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ isFirstRun: false });
    });

    it("handles database errors gracefully", async () => {
      const mockFindMany = vi.fn().mockRejectedValueOnce(new Error("Database error"));
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const response = await getFirstRunStatus();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST /api/first-run/restore", () => {
    const mockFile = new File(["test"], "backup.zip", { type: "application/zip" });
    const mockFormData = new FormData();
    mockFormData.append("backup", mockFile);

    beforeEach(() => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(restoreBackupUtil).mockResolvedValue(undefined);
    });

    it("restores backup during first run", async () => {
      const mockFindMany = vi.fn().mockResolvedValueOnce([createMockUser({ lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: mockFormData,
      });

      const response = await restoreBackup(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(restoreBackupUtil).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled(); // Verify cleanup
    });

    it("returns 403 when not in first run state", async () => {
      const mockFindMany = vi
        .fn()
        .mockResolvedValueOnce([createMockUser({ lastLoginAt: new Date() })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: mockFormData,
      });

      const response = await restoreBackup(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Restore is only available during first run" });
    });

    it("returns 400 when no backup file provided", async () => {
      const mockFindMany = vi.fn().mockResolvedValueOnce([createMockUser({ lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const emptyFormData = new FormData();
      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: emptyFormData,
      });

      const response = await restoreBackup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "No backup file provided" });
    });

    it("returns 400 for invalid file type", async () => {
      const mockFindMany = vi.fn().mockResolvedValueOnce([createMockUser({ lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      const invalidFile = new File(["test"], "backup.txt", { type: "text/plain" });
      const invalidFormData = new FormData();
      invalidFormData.append("backup", invalidFile);

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: invalidFormData,
      });

      const response = await restoreBackup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid file type. Please upload a .zip file" });
    });

    it("handles restore errors gracefully", async () => {
      const mockFindMany = vi.fn().mockResolvedValueOnce([createMockUser({ lastLoginAt: null })]);
      vi.mocked(prisma.user.findMany).mockImplementation(mockFindMany);

      vi.mocked(restoreBackupUtil).mockRejectedValueOnce(new Error("Restore failed"));

      const request = new NextRequest("http://localhost/api/first-run/restore", {
        method: "POST",
        body: mockFormData,
      });

      const response = await restoreBackup(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Restore failed" });
      expect(fs.unlink).toHaveBeenCalled(); // Verify cleanup still happens
    });
  });
});
