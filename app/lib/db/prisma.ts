import { PrismaClient } from "@prisma/client";
import { DB_CONFIG } from "./database-config";

// Configure environment variables for Prisma
process.env.PRISMA_ACCELERATE_DISABLED = "true";

// Log database URLs in non-production environments
if (process.env.NODE_ENV !== "production") {
  console.log("Initializing Prisma with:");
  console.log(`- Direct URL: ${DB_CONFIG.directUrl}`);
}

// Initialize PrismaClient with explicit configuration using the direct URL
const prismaClientSingleton = () => {
  // Always use the file: protocol directly
  const dbUrl = process.env.DIRECT_DATABASE_URL || "file:./data/app.db";
  const finalUrl = dbUrl.startsWith("prisma:") ? dbUrl.replace(/^prisma:/, "file:") : dbUrl;

  return new PrismaClient({
    datasources: {
      db: {
        url: finalUrl, // Always use the file: URL
      },
    },
    // Logging configuration based on environment
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

export default prisma;

// Test that the database is accessible
prisma.$queryRaw`SELECT 1`
  .then(() => console.log("Database connection successful"))
  .catch((err) => console.error("Database connection error:", err));

// Ensure the exported PrismaClient has all the models
export type { PrismaClient } from "@prisma/client";
