import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  isConnecting: boolean;
}

// Function to create a new PrismaClient instance
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Function to get or create Prisma client with connection check
async function getPrismaClient(): Promise<PrismaClient> {
  // If we already have a client, try to ping it
  if (globalForPrisma.prisma) {
    try {
      // Test the connection with a simple query
      await globalForPrisma.prisma.$queryRaw`SELECT 1`
      return globalForPrisma.prisma
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Connection failed, clean up the old client
      await globalForPrisma.prisma.$disconnect()
      globalForPrisma.prisma = undefined
    }
  }

  // If another process is connecting, wait for it
  while (globalForPrisma.isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // If we still don't have a client, create one
  if (!globalForPrisma.prisma) {
    globalForPrisma.isConnecting = true
    try {
      const client = createPrismaClient()
      await client.$connect()
      globalForPrisma.prisma = client
    } finally {
      globalForPrisma.isConnecting = false
    }
  }

  return globalForPrisma.prisma
}

// Export the async function to get the client
export async function getPrisma() {
  return getPrismaClient()
}

// For backwards compatibility, export a synchronous version
// This should only be used when we know the client exists
export const prisma = globalForPrisma.prisma || createPrismaClient()

// In development, save to global to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
