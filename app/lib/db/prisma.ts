import { PrismaClient } from '@prisma/client';

// Global variable to hold the Prisma client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Export a singleton instance of Prisma client
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Save the client in development to avoid multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
