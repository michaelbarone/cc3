import { createTestTimer, debugResponse, measureTestTime } from "@/test/helpers/debug";
import { fileSystemMock, setupFileSystemMocks } from "@/test/mocks/services/filesystem/fs.mock";
import { PrismaMock } from "@/test/mocks/services/prisma/prisma.mock";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Create test timer
const timer = createTestTimer();

// Mock modules
vi.mock("@/app/lib/db/prisma", () => ({
  prisma: PrismaMock.getInstance(),
}));

// Setup filesystem mocks
setupFileSystemMocks();

describe("Health Check API", () => {
  const suiteTimer = measureTestTime();

  beforeEach(() => {
    PrismaMock.reset();
    fileSystemMock.reset();
    // Ensure accessSync is properly mocked for each test
    fileSystemMock.accessSync.mockImplementation((path: string, mode?: number) => {
      // Default implementation returns undefined for success
      return undefined;
    });
  });

  afterAll(() => {
    suiteTimer.end();
  });

  it("returns healthy status when all systems are operational", async () => {
    timer.start("healthy status test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    fileSystemMock.accessSync.mockReturnValueOnce(undefined);

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("healthy status test");

    // Assert
    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.checks).toEqual({
      database: true,
      filesystem: true,
      memory: true,
    });
  });

  it("returns unhealthy status when database connection fails", async () => {
    timer.start("database failure test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockRejectedValueOnce(new Error("DB Error"));
    fileSystemMock.accessSync.mockReturnValueOnce(undefined);

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("database failure test");

    // Assert
    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.checks.database).toBe(false);
    expect(data.error).toBe("database check failed");
  });

  it("validates timestamp format in healthy response", async () => {
    timer.start("timestamp validation test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    fileSystemMock.accessSync.mockReturnValueOnce(undefined);

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("timestamp validation test");

    // Assert
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("includes version information in the response", async () => {
    timer.start("version info test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    fileSystemMock.accessSync.mockReturnValueOnce(undefined);

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("version info test");

    // Assert
    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe("string");
  });

  it("handles multiple system check failures", async () => {
    timer.start("multiple failures test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockRejectedValueOnce(new Error("DB Error"));
    fileSystemMock.accessSync.mockImplementationOnce(() => {
      throw new Error("FS Error");
    });

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("multiple failures test");

    // Assert
    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.checks).toEqual({
      database: false,
      filesystem: false,
      memory: true,
    });
    expect(data.error).toBe("Multiple system checks failed");
  });

  it("includes performance metrics in the response", async () => {
    timer.start("performance metrics test");

    // Arrange
    PrismaMock.getInstance().$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    fileSystemMock.accessSync.mockReturnValueOnce(undefined);

    // Act
    const response = await GET();
    const data = await debugResponse<HealthCheckResponse>(response);
    timer.end("performance metrics test");

    // Assert
    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics.uptime).toBe("number");
    expect(typeof data.metrics.responseTime).toBe("number");
    expect(typeof data.metrics.memoryUsage).toBe("number");
  });
});

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    database: boolean;
    filesystem: boolean;
    memory: boolean;
  };
  version: string;
  metrics: {
    uptime: number;
    responseTime: number;
    memoryUsage: number;
  };
  error?: string;
}
