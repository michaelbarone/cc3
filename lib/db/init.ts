import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { main as seedDatabase } from '../../prisma/seed'

const prisma = new PrismaClient()

// Flag to ensure we only try to initialize once per process
let isInitializing = false

// Create required directories if they don't exist
function createRequiredDirectories() {
  const directories = [
    'data',
    'data/backups',
    'public/uploads',
    'public/icons',
    'public/avatars',
    'public/logos',
    'public/favicons'
  ]

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`Created directory: ${dirPath}`)
    }
  })
}

export async function initializeDatabase() {
  // Prevent concurrent initialization attempts
  if (isInitializing) {
    return
  }

  isInitializing = true

  try {
    // Create all required directories
    createRequiredDirectories()

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

// Function to seed test data - can be called manually when needed
export async function seedTestData() {
  try {
    console.log('Seeding test data...')

    // Create two URL groups
    const devGroup = await prisma.urlGroup.create({
      data: {
        name: 'Development Tools',
        description: 'Essential development and debugging tools',
      },
    })

    const monitoringGroup = await prisma.urlGroup.create({
      data: {
        name: 'System Monitoring',
        description: 'System monitoring and analytics dashboards',
      },
    })

    // Create 5 URLs with realistic examples
    const urls = [
      {
        title: 'GitHub Dashboard',
        url: 'https://github.com',
        urlMobile: 'https://github.com/mobile',
        displayOrder: 0,
        idleTimeoutMinutes: 30,
        urlGroupId: devGroup.id
      },
      {
        title: 'Jenkins CI',
        url: 'https://jenkins.example.com',
        displayOrder: 1,
        idleTimeoutMinutes: 15,
        urlGroupId: devGroup.id
      },
      {
        title: 'Grafana Metrics',
        url: 'https://grafana.example.com',
        displayOrder: 0,
        idleTimeoutMinutes: 5,
        urlGroupId: monitoringGroup.id
      },
      {
        title: 'Kibana Logs',
        url: 'https://kibana.example.com',
        displayOrder: 1,
        idleTimeoutMinutes: 10,
        urlGroupId: monitoringGroup.id
      },
      {
        title: 'Prometheus Alerts',
        url: 'https://prometheus.example.com',
        displayOrder: 2,
        idleTimeoutMinutes: 2,
        urlGroupId: monitoringGroup.id
      }
    ]

    // Create all URLs
    await Promise.all(urls.map(url =>
      prisma.url.create({ data: url })
    ))

    // Assign groups to admin user if they exist
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' }
    })

    if (admin) {
      await Promise.all([
        prisma.userUrlGroup.create({
          data: {
            userId: admin.id,
            urlGroupId: devGroup.id,
          },
        }),
        prisma.userUrlGroup.create({
          data: {
            userId: admin.id,
            urlGroupId: monitoringGroup.id,
          },
        })
      ])
    }

    console.log('Test data seeded successfully')
  } catch (error) {
    console.error('Error seeding test data:', error)
    throw error
  }
}
