/**
 * Test database setup utilities
 * Provides functions for managing the test database lifecycle
 */
import { test } from 'vitest';
import {
  closeTestDatabase,
  initializeTestDatabase,
  resetTestDatabase,
  seedTestDatabase,
  testPrisma
} from '../mocks/services/prisma/test-db-client';

/**
 * Setup test database for a test suite
 * @param options Configuration options
 * @returns Promise that resolves when setup is complete
 */
export const setupTestDatabase = async (options: {
  initialize?: boolean; // Run migrations to initialize DB structure
  seed?: boolean; // Seed with minimal test data
  reset?: boolean; // Clear all data before tests
} = {}): Promise<void> => {
  const { initialize = true, seed = true, reset = true } = options;

  try {
    if (initialize) {
      await initializeTestDatabase();
    }

    if (reset) {
      await resetTestDatabase();
    }

    if (seed) {
      await seedTestDatabase();
    }
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
};

/**
 * Tear down test database after tests
 * @returns Promise that resolves when teardown is complete
 */
export const teardownTestDatabase = async (): Promise<void> => {
  try {
    await closeTestDatabase();
  } catch (error) {
    console.error('Test database teardown failed:', error);
    throw error;
  }
};

/**
 * Transaction wrapper for test isolation
 * @param callback Function to execute within transaction
 * @returns Result of the callback function
 */
export const withTestTransaction = async <T>(
  callback: (tx: typeof testPrisma) => Promise<T>
): Promise<T> => {
  return testPrisma.$transaction(async (tx: any) => {
    return callback(tx as any);
  });
};

/**
 * Create test data within a transaction
 * @param creator Function that creates test data
 * @returns Created test data
 */
export const createTestData = async <T>(
  creator: (db: typeof testPrisma) => Promise<T>
): Promise<T> => {
  return withTestTransaction(creator);
};

/**
 * Helper to run a test with database access
 * @param name Test name
 * @param fn Test function that receives the test database client
 */
export const dbTest = (
  name: string,
  fn: (db: typeof testPrisma) => Promise<void>,
  timeout?: number
) => {
  return test(
    name,
    async () => {
      await fn(testPrisma);
    },
    timeout
  );
};
