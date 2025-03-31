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

  it("returns healthy status when all systems are operational", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: "healthy",
      timestamp: expect.any(String),
      checks: {
        database: true,
        filesystem: true,
        memory: true,
      },
      version: expect.any(String),
      metrics: {
        uptime: expect.any(Number),
        responseTime: expect.any(Number),
        memoryUsage: expect.any(Number),
      },
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
      timestamp: expect.any(String),
      checks: {
        database: false,
        filesystem: true,
        memory: true,
      },
      version: expect.any(String),
      metrics: {
        uptime: expect.any(Number),
        responseTime: expect.any(Number),
        memoryUsage: expect.any(Number),
      },
      error: "database check failed",
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

  it("includes version information in the response", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe("string");
    expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("includes detailed system checks in the response", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks).toEqual({
      database: true,
      filesystem: true,
      memory: true,
    });
  });

  it("handles multiple system check failures", async () => {
    const mockQueryRaw = vi.fn().mockRejectedValueOnce(new Error("Database connection failed"));
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    // Mock process.memoryUsage to simulate high memory usage
    const originalMemoryUsage = process.memoryUsage;
    const mockMemoryUsage = vi.fn().mockReturnValue({
      heapUsed: 2000000000, // 2GB - above threshold
      heapTotal: 2000000000,
      rss: 2200000000,
      external: 0,
      arrayBuffers: 0,
    }) as unknown as typeof process.memoryUsage;
    process.memoryUsage = mockMemoryUsage;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: "unhealthy",
      timestamp: expect.any(String),
      checks: {
        database: false,
        filesystem: true,
        memory: false,
      },
      version: expect.any(String),
      metrics: {
        uptime: expect.any(Number),
        responseTime: expect.any(Number),
        memoryUsage: expect.any(Number),
      },
      error: "Multiple system checks failed",
    });

    // Restore original memoryUsage function
    process.memoryUsage = originalMemoryUsage;
  });

  it("includes performance metrics in the response", async () => {
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
    vi.mocked(prisma.$queryRaw).mockImplementation(mockQueryRaw);

    const response = await GET();
    const data = await response.json();

    expect(data.metrics).toBeDefined();
    expect(data.metrics).toEqual({
      uptime: expect.any(Number),
      responseTime: expect.any(Number),
      memoryUsage: expect.any(Number),
    });
  });
});
