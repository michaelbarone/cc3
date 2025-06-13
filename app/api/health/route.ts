import { prisma } from "@/app/lib/db/prisma";
import pkg from "@/package.json";
import fs from "fs";
import { NextResponse } from "next/server";

const MEMORY_THRESHOLD = 1024 * 1024 * 1024; // 1GB
const version = pkg.version;

export async function GET() {
  const startTime = process.hrtime();
  const checks = {
    database: false,
    filesystem: false,
    memory: false,
  };
  let isHealthy = true;
  let error = "";

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    isHealthy = false;
    error = "database check failed";
  }

  // Check filesystem
  try {
    fs.accessSync(".", fs.constants.R_OK | fs.constants.W_OK);
    checks.filesystem = true;
  } catch (e) {
    isHealthy = false;
    error = error ? "Multiple system checks failed" : "filesystem check failed";
  }

  // Check memory
  const memUsage = process.memoryUsage();
  checks.memory = memUsage.heapUsed < MEMORY_THRESHOLD;
  if (!checks.memory) {
    isHealthy = false;
    error = error ? "Multiple system checks failed" : "memory usage exceeded threshold";
  }

  // Calculate response time
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const responseTime = seconds * 1000 + nanoseconds / 1000000;

  const response = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checks,
    version,
    metrics: {
      uptime: process.uptime(),
      responseTime,
      memoryUsage: memUsage.heapUsed,
    },
    ...(error && { error }),
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
  });
}
