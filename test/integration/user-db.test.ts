/**
 * Integration test example using the test database
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { measureTestTime } from '../helpers/performance';
import { testPrisma } from '../mocks/services/prisma/test-db-client';
import { dbTest, setupTestDatabase, teardownTestDatabase, withTestTransaction } from '../setup/test-database';

describe('User Database Operations', () => {
  const testTimer = measureTestTime('User DB Integration Suite');

  // Set up the test database before all tests
  beforeAll(async () => {
    await setupTestDatabase({
      initialize: true, // Apply migrations
      seed: true,      // Add minimal test data
      reset: true,     // Clear existing data
    });
  });

  // Clean up after each test to ensure isolation
  beforeEach(async () => {
    // Reset user data but keep app config
    await testPrisma.userSetting.deleteMany();
    await testPrisma.userUrlGroup.deleteMany();
    await testPrisma.user.deleteMany();

    // Recreate test admin
    await testPrisma.user.create({
      data: {
        username: 'test-admin',
        passwordHash: 'test-password-hash',
        isAdmin: true,
      },
    });
  });

  // Clean up database connection after all tests
  afterAll(async () => {
    await teardownTestDatabase();
    testTimer.end();
  });

  // Example test using dbTest helper
  dbTest('should create a new user', async (db) => {
    const testTimer = measureTestTime('create user test');
    try {
      // Create test user
      const user = await db.user.create({
        data: {
          username: 'test-user',
          passwordHash: 'password-hash',
          isAdmin: false,
        },
      });

      // Verify user was created
      expect(user).toBeDefined();
      expect(user.username).toBe('test-user');
      expect(user.isAdmin).toBe(false);

      // Verify we can retrieve the user
      const retrievedUser = await db.user.findUnique({
        where: { username: 'test-user' },
      });

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(user.id);
    } finally {
      testTimer.end();
    }
  });

  // Example test using withTestTransaction for isolation
  it('should create and update user settings', async () => {
    const testTimer = measureTestTime('user settings test');
    try {
      await withTestTransaction(async (tx) => {
        // Create test user with settings
        const user = await tx.user.create({
          data: {
            username: 'settings-user',
            passwordHash: 'password-hash',
            isAdmin: false,
            settings: {
              create: [
                { key: 'theme', value: 'dark' },
                { key: 'language', value: 'en' },
              ],
            },
          },
          include: {
            settings: true,
          },
        });

        // Verify settings were created
        expect(user.settings).toHaveLength(2);
        expect(user.settings.find(s => s.key === 'theme')?.value).toBe('dark');

        // Update a setting
        await tx.userSetting.update({
          where: {
            userId_key: {
              userId: user.id,
              key: 'theme',
            },
          },
          data: {
            value: 'light',
          },
        });

        // Verify setting was updated
        const updatedSetting = await tx.userSetting.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key: 'theme',
            },
          },
        });

        expect(updatedSetting?.value).toBe('light');
      });
    } finally {
      testTimer.end();
    }
  });

  // Example demonstrating test isolation
  it('should maintain test isolation', async () => {
    const testTimer = measureTestTime('test isolation verification');
    try {
      // This should find only the admin user created in beforeEach
      const usersCount = await testPrisma.user.count();
      expect(usersCount).toBe(1);

      // Create another user
      await testPrisma.user.create({
        data: {
          username: 'isolation-test-user',
          passwordHash: 'password-hash',
          isAdmin: false,
        },
      });

      // Now we should have 2 users
      const newCount = await testPrisma.user.count();
      expect(newCount).toBe(2);
    } finally {
      testTimer.end();
    }
  });
});
