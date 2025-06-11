import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./constants";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in a build process
function isBuildProcess() {
  return (
    process.env.NODE_ENV === "production" &&
    process.argv.some((arg) => arg.includes("next") && arg.includes("build"))
  );
}

// Create a mock PrismaClient that does nothing during build
const createMockPrismaClient = () => {
  const handler = {
    get: (target: any, prop: string) => {
      if (prop === "then") {
        // Special case for handling Promise unwrapping
        return undefined;
      }

      // Return a proxy for nested properties
      return new Proxy(() => {}, {
        get: () => handler.get({}, ""),
        apply: () => new Proxy({}, handler),
      });
    },
    apply: () => new Proxy({}, handler),
  };

  return new Proxy({}, handler) as unknown as PrismaClient;
};

// Use mock client during build, real client otherwise
export const prisma = isBuildProcess()
  ? createMockPrismaClient()
  : (globalForPrisma.prisma ??
    new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl(),
        },
      },
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
