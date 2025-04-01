import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

// Mock dependencies
vi.mock("@/app/lib/auth/jwt");
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    userSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Test data
const mockTokenPayload = {
  id: "user-123",
  username: "testuser",
  isAdmin: false,
};

const mockLanguageSetting = {
  userId: "user-123",
  key: "languagePreference",
  value: JSON.stringify("en"),
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-02"),
};

describe("Language Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings/language", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns default language when no setting exists", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.userSetting.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.language).toBe("en");
      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);
    });

    it("returns user language preference when set", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.userSetting.findUnique).mockResolvedValue(mockLanguageSetting);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.language).toBe("en");
      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);
    });

    it("handles database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.userSetting.findUnique).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get language setting");
    });
  });

  describe("PATCH /api/settings/language", () => {
    const createRequest = (body: any) =>
      new NextRequest("http://localhost/api/settings/language", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(verifyToken).mockResolvedValue(null);

      const response = await PATCH(createRequest({ language: "es" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when language is not supported", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);

      const response = await PATCH(createRequest({ language: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Unsupported language");
      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);
    });

    it("updates language preference successfully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.userSetting.upsert).mockResolvedValue({
        ...mockLanguageSetting,
        value: JSON.stringify("es"),
      });

      const response = await PATCH(createRequest({ language: "es" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.language).toBe("es");
      expect(data.message).toBe("Language preference updated successfully");
      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);

      expect(prisma.userSetting.upsert).toHaveBeenCalledWith({
        where: {
          userId_key: {
            userId: mockTokenPayload.id,
            key: "languagePreference",
          },
        },
        update: {
          value: JSON.stringify("es"),
          updatedAt: expect.any(Date),
        },
        create: {
          userId: mockTokenPayload.id,
          key: "languagePreference",
          value: JSON.stringify("es"),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });

    it("handles database errors gracefully", async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
      vi.mocked(prisma.userSetting.upsert).mockRejectedValue(new Error("Database error"));

      const response = await PATCH(createRequest({ language: "es" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update language setting");
    });
  });
});
