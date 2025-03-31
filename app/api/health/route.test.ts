import { GET } from "@/app/api/health/route";
import { prisma } from "@/app/lib/db/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("Health Check API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status when database is connected", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: "healthy",
      timestamp: expect.any(String),
    });
    expect(prisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));
  });

  it("returns unhealthy status when database connection fails", async () => {
    const mockQueryRaw = vi.fn().mockRejectedValueOnce(new Error("Database connection failed"));
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: "unhealthy",
      error: "Database connection failed",
    });
    expect(prisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));
  });

  it("validates timestamp format in healthy response", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Verify timestamp is a valid ISO string
    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});
