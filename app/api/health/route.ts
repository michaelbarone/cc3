import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "healthy", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 },
    );
  }
}
