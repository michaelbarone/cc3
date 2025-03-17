import { PrismaClient } from '@prisma/client'
import { initializeDatabase } from './init'

const globalForPrisma = globalThis as { prisma?: PrismaClient }

// Prevent multiple instances of Prisma Client in development
const prismadb = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismadb
}

// Initialize database and export client
let initialized = false

async function getInitializedPrisma() {
  if (!initialized) {
    try {
      await initializeDatabase()
      initialized = true
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }
  return prismadb
}

// Export an async function to get the initialized client
export async function getPrismaClient() {
  return await getInitializedPrisma()
}

// For backwards compatibility and direct access when we know initialization has occurred
export default prismadb
