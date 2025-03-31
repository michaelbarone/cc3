import { prisma } from "@/app/lib/db/prisma";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

// Memory usage thresholds (in bytes)
const MEMORY_THRESHOLD = 1024 * 1024 * 1024; // 1GB
const DATA_DIR = path.join(process.cwd(), "data");

interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    database: boolean;
    filesystem: boolean;
    memory: boolean;
  };
  version: string;
  metrics?: {
    uptime: number;
    responseTime: number;
    memoryUsage: number;
  };
  error?: string;
}

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function checkFilesystem(): boolean {
  try {
    fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function checkMemory(): boolean {
  const { heapUsed, heapTotal } = process.memoryUsage();
  return heapUsed < MEMORY_THRESHOLD && heapTotal < MEMORY_THRESHOLD;
}

export async function GET(): Promise<NextResponse> {
  const startTime = process.hrtime();

  // Run all health checks
  const checks = {
    database: await checkDatabase(),
    filesystem: checkFilesystem(),
    memory: checkMemory(),
  };

  // Calculate response time
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const responseTime = seconds * 1000 + nanoseconds / 1000000;

  // Prepare response
  const response: HealthResponse = {
    status: Object.values(checks).every(Boolean) ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || "1.0.0",
    metrics: {
      uptime: process.uptime(),
      responseTime,
      memoryUsage: process.memoryUsage().heapUsed,
    },
  };

  // Add error message if unhealthy
  if (response.status === "unhealthy") {
    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => check);

    response.error =
      failedChecks.length === 1
        ? `${failedChecks[0]} check failed`
        : "Multiple system checks failed";
  }

  return NextResponse.json(response, {
    status: response.status === "healthy" ? 200 : 503,
  });
}
