import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Flag to ensure we only try to initialize once per process
let isInitializing = false

export async function initializeDatabase() {
  // Prevent concurrent initialization attempts
  if (isInitializing) {
    return
  }

  isInitializing = true

  try {
    // Ensure the data directory exists
    const dbDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Run migrations first
    console.log('Running database migrations...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })

    // Now try to connect
    await prisma.$connect()

    // Check if we need to seed
    const userCount = await prisma.user.count()

    if (userCount === 0) {
      console.log('Database is empty. Running initial seed...')
      await seedDatabase()
    }

    console.log('Database initialization completed successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  } finally {
    isInitializing = false
    await prisma.$disconnect()
  }
}

async function seedDatabase() {
  try {
    // Create default admin user
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        isAdmin: true,
        // No password by default as per requirements
      },
    })

    // Create default URL group
    const defaultGroup = await prisma.urlGroup.create({
      data: {
        name: 'Default Group',
        description: 'Default URL group created during initialization',
      },
    })

    // Assign admin to the default group
    await prisma.userUrlGroup.create({
      data: {
        userId: admin.id,
        urlGroupId: defaultGroup.id,
      },
    })

    // Create default app config
    await prisma.appConfig.create({
      data: {
        id: 'app-config',
        appName: 'Control Center',
        loginTheme: 'dark',
      },
    })

    console.log('Initial seed completed successfully')
  } catch (error) {
    console.error('Seed error:', error)
    throw error
  }
}
