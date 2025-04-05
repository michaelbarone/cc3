import { mockVerifyToken } from "@/app/lib/test/auth-mock";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PATCH } from "./route";

// Mock external dependencies
vi.mock("@/app/lib/auth/jwt", () => ({
  verifyToken: mockVerifyToken,
}));

type AppConfigMock = {
  id: string;
  appName: string;
  appLogo: string | null;
  loginTheme: string;
};

const mockUpsert = vi.fn().mockImplementation(() =>
  Promise.resolve<AppConfigMock>({
    id: "app-config",
    appName: "Control Center",
    appLogo: null,
    loginTheme: "light",
  }),
);

vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    appConfig: {
      upsert: mockUpsert,
    },
  } as unknown as PrismaClient,
}));

describe("Theme API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockVerifyToken.mockResolvedValue({ isAdmin: true });
  });

  describe("PATCH /api/admin/app-config/theme", () => {
    test("successfully updates theme to light", async () => {
      mockUpsert.mockResolvedValue({
        id: "app-config",
        appName: "Control Center",
        appLogo: null,
        loginTheme: "light",
      });

      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "light" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("light");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "app-config" },
        update: { loginTheme: "light" },
        create: {
          appName: "Control Center",
          appLogo: null,
          loginTheme: "light",
        },
      });
    });

    test("successfully updates theme to dark", async () => {
      mockUpsert.mockResolvedValue({
        id: "app-config",
        appName: "Control Center",
        appLogo: null,
        loginTheme: "dark",
      });

      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "dark" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.loginTheme).toBe("dark");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "app-config" },
        update: { loginTheme: "dark" },
        create: {
          appName: "Control Center",
          appLogo: null,
          loginTheme: "dark",
        },
      });
    });

    test("handles unauthorized access", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "light" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    test("handles non-admin access", async () => {
      mockVerifyToken.mockResolvedValue({ isAdmin: false });

      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "light" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin privileges required");
    });

    test("handles missing theme", async () => {
      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid login theme (light or dark) is required");
    });

    test("handles invalid theme value", async () => {
      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "invalid" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid login theme (light or dark) is required");
    });

    test("handles database error", async () => {
      mockUpsert.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: JSON.stringify({ loginTheme: "light" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error updating login theme");
    });

    test("handles invalid JSON in request body", async () => {
      const request = new NextRequest("http://localhost/api/admin/app-config/theme", {
        method: "PATCH",
        body: "invalid json",
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error updating login theme");
    });
  });
});
