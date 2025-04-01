import { PATCH } from "@/app/api/admin/app-config/registration/route";
import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      upsert: vi.fn(),
    },
  },
}));

describe("Registration Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRequest = (body: any) =>
    new NextRequest("http://localhost/api/admin/app-config/registration", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("updates registration enabled setting when authenticated as admin", async () => {
    const updatedConfig = {
      id: "app-config",
      appName: "Control Center",
      appLogo: null,
      loginTheme: "dark",
      registrationEnabled: true,
    };

    vi.mocked(verifyToken).mockResolvedValueOnce({
      id: "admin-id",
      username: "admin",
      isAdmin: true,
    });
    vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

    const response = await PATCH(mockRequest({ registrationEnabled: true }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(updatedConfig);
    expect(prisma.appConfig.upsert).toHaveBeenCalledWith({
      where: { id: "app-config" },
      update: { registrationEnabled: true },
      create: {
        appName: "Control Center",
        appLogo: null,
        loginTheme: "dark",
        registrationEnabled: true,
      },
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce(null);

    const response = await PATCH(mockRequest({ registrationEnabled: true }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when authenticated but not admin", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      id: "user-id",
      username: "user",
      isAdmin: false,
    });

    const response = await PATCH(mockRequest({ registrationEnabled: true }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Admin privileges required" });
  });

  it("returns 400 when registrationEnabled is not a boolean", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      id: "admin-id",
      username: "admin",
      isAdmin: true,
    });

    const response = await PATCH(mockRequest({ registrationEnabled: "true" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Valid registration enabled setting (boolean) is required",
    });
  });

  it("handles database errors gracefully", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      id: "admin-id",
      username: "admin",
      isAdmin: true,
    });
    vi.mocked(prisma.appConfig.upsert).mockRejectedValueOnce(new Error("Database error"));

    const response = await PATCH(mockRequest({ registrationEnabled: true }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Error updating registration setting" });
  });
});
