/**
 * Test-specific Prisma client for integration tests
 * Uses a separate test database to avoid impacting development data
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Set default test database location if not specified in environment
const TEST_DB_PATH = process.env.TEST_DATABASE_PATH || path.join(process.cwd(), 'test', 'test-database.db');
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

// Global reference to prevent multiple instances
const globalForPrisma = globalThis as unknown as {
  testPrisma: PrismaClient | undefined;
};

// Create client with test-specific database URL
export const testPrisma =
  globalForPrisma.testPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL,
      },
    },
    log: ['error'],
  });

// Manage reference in non-production environments
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.testPrisma = testPrisma;
}

/**
 * Initialize test database by applying schema migrations
 * @returns Promise that resolves when database is ready
 */
export const initializeTestDatabase = async (): Promise<void> => {
  try {
    // Create test database directory if it doesn't exist
    const dbDir = path.dirname(TEST_DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });

    // Run prisma migrations on test database
    const { execSync } = require('child_process');
    execSync(`npx prisma migrate deploy`, {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
    });

    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};

/**
 * Reset the test database to a clean state
 * @returns Promise that resolves when database is reset
 */
export const resetTestDatabase = async (): Promise<void> => {
  try {
    // Delete all data from tables in reverse order of foreign key dependencies
    await testPrisma.$transaction([
      testPrisma.userSetting.deleteMany(),
      testPrisma.urlsInGroups.deleteMany(),
      testPrisma.userUrlGroup.deleteMany(),
      testPrisma.url.deleteMany(),
      testPrisma.urlGroup.deleteMany(),
      testPrisma.user.deleteMany(),
      testPrisma.appConfig.deleteMany(),
    ]);

    console.log('Test database reset successfully');
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
};

/**
 * Seed test database with minimal required data
 * @returns Promise that resolves when database is seeded
 */
export const seedTestDatabase = async (): Promise<void> => {
  try {
    // Create app config if it doesn't exist
    await testPrisma.appConfig.upsert({
      where: { id: 'app-config' },
      update: {},
      create: {
        appName: 'Test Control Center',
        loginTheme: 'dark',
        registrationEnabled: true,
      },
    });

    // Create test admin user
    await testPrisma.user.upsert({
      where: { username: 'test-admin' },
      update: { isAdmin: true },
      create: {
        username: 'test-admin',
        passwordHash: 'test-password-hash',
        isAdmin: true,
      },
    });

    console.log('Test database seeded successfully');
  } catch (error) {
    console.error('Failed to seed test database:', error);
    throw error;
  }
};

/**
 * Close test database connection
 */
export const closeTestDatabase = async (): Promise<void> => {
  await testPrisma.$disconnect();
};
