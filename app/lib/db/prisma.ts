import { PrismaClient } from "@prisma/client";

// Define a custom interface for the Prisma Client with all models that we use
declare global {
  namespace PrismaJson {
    // Custom scalar JSON types go here
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a robust PrismaClient factory with error handling
function createPrismaClient(): PrismaClient {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

    // Test connection and handle errors gracefully
    client.$connect().catch((e) => console.error("Prisma connection error:", e));

    // Add error handling for common operations
    const originalClient = client;
    return new Proxy(originalClient, {
      get(target, prop) {
        const value = Reflect.get(target, prop);

        // Handle model access like prisma.appConfig
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          prop !== "$connect" &&
          prop !== "$disconnect"
        ) {
          return new Proxy(value, {
            get(modelTarget, modelProp) {
              const modelMethod = Reflect.get(modelTarget, modelProp);

              // Add error handling for model methods
              if (typeof modelMethod === "function") {
                return async (...args: any[]) => {
                  try {
                    return await modelMethod.apply(modelTarget, args);
                  } catch (error) {
                    console.error(`Error in prisma.${String(prop)}.${String(modelProp)}:`, error);
                    // Rethrow to allow caller to handle specific errors
                    throw error;
                  }
                };
              }

              return modelMethod;
            },
          });
        }

        return value;
      },
    });
  } catch (e) {
    console.error("Error creating Prisma client:", e);
    // Fallback to basic client if initialization fails
    return new PrismaClient();
  }
}

// Use existing client or create a new one
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store the client in development for hot reloading
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Ensure the exported PrismaClient has all the models
export type { PrismaClient } from "@prisma/client";
