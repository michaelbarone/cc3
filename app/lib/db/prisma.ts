/**
 * Prisma Client Instance
 *
 * This module provides a singleton instance of PrismaClient for the application.
 * It ensures that we use the correct database URL with the file: protocol.
 */

import { PrismaClient } from "@prisma/client";

// Force disable Prisma Accelerate
process.env.PRISMA_ACCELERATE_DISABLED = "true";

// Set environment variable for Prisma client engine type
process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

// Define a consistent database URL that always uses file: protocol
const getDbUrl = (): string => {
  // Get URL from environment or use default
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL || "file:./data/app.db";

  // Handle any protocol conversion
  if (dbUrl.startsWith("prisma:")) {
    console.log(`Converting database URL from prisma:// to file: protocol`);
    return dbUrl.replace(/^prisma:/, "file:");
  }

  // Ensure URL has file: prefix
  if (!dbUrl.startsWith("file:")) {
    console.log(`Adding file: protocol to database URL`);
    return `file:${dbUrl}`;
  }

  return dbUrl;
};

// Create PrismaClient with explicit configuration
const prismaClientSingleton = () => {
  const dbUrl = getDbUrl();
  console.log(`Using database URL: ${dbUrl}`);

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    // Configure logging based on environment
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

// Create a global instance for the Prisma client
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Setup global store for the client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Use existing client or create a new one
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// In development, reset the client on each reload
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Test that the database is accessible (but don't block initialization if it fails)
prisma.$queryRaw`SELECT 1`
  .then(() => console.log("Database connection successful"))
  .catch((err) => console.error("Database connection error:", err));

// Export the client as default
export default prisma;

// Ensure the exported PrismaClient has all the models
export type { PrismaClient } from "@prisma/client";
