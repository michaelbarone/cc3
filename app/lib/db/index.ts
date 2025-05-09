import { prisma } from "./prisma";

export const db = prisma;

export { initializeDatabase } from "./init";
export { prisma } from "./prisma";
export { getPrismaClient } from "./provider";

// Default export for backwards compatibility
export default prisma;
