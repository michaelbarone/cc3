import { initializeDatabase } from "./init";
import { prisma } from "./prisma";

// Initialize database and export client
let initialized = false;

async function getInitializedPrisma() {
  if (!initialized) {
    try {
      await initializeDatabase();
      initialized = true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
  return prisma;
}

export async function getPrismaClient() {
  return getInitializedPrisma();
}

// For backwards compatibility and direct access when we know initialization has occurred
export default prisma;
