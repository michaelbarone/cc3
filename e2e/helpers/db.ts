import { exec } from "child_process";
import fs from "fs";
import { promisify } from "util";
import { prisma } from "../../app/lib/db/prisma";
import { seedTestData } from "../../lib/db/init";

const execPromise = promisify(exec);

/**
 * Attempts to delete a file with retries for Windows file locks
 */
async function deleteFileWithRetry(
  filePath: string,
  maxRetries = 5,
  delayMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Waits for database to be ready
 */
async function waitForDatabase(retries = 5, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
}

/**
 * Seeds the database with test data for E2E tests.
 * Uses the same seed data as development for consistency.
 */
export async function setupTestDatabase() {
  try {
    await waitForDatabase();
    await seedTestData();
    console.log("✓ E2E test database seeded successfully");
  } catch (error) {
    console.error("Failed to seed E2E test database:", error);
    throw error;
  }
}

/**
 * Resets the database to a clean state for first-time setup tests.
 */
export async function resetDatabaseForFirstTimeSetup() {
  try {
    console.log("Starting test database reset...");

    // 1. Drop all tables using Prisma
    console.log("Dropping all tables...");
    try {
      // Delete all data from tables in the correct order to handle foreign key constraints
      await prisma.$transaction([
        prisma.$executeRaw`DELETE FROM "UrlGroup"`,
        prisma.$executeRaw`DELETE FROM "User"`,
        prisma.$executeRaw`DELETE FROM "AppConfig"`,
      ]);
      console.log("✓ All tables cleared");
    } catch (error) {
      console.error("Error clearing tables:", error);
      throw error;
    }

    // 2. Run Prisma migrations to ensure schema is up to date
    console.log("Running database migrations...");
    try {
      const { stdout, stderr } = await execPromise("npx prisma migrate deploy");
      if (stderr) console.error("Migration stderr:", stderr);
      if (stdout) console.log("Migration stdout:", stdout);
    } catch (execError) {
      console.error("Failed to run migrations:", execError);
      throw execError;
    }

    // 3. Wait for database to be ready
    console.log("Waiting for database to be ready...");
    await waitForDatabase();

    // 4. Create default admin user if it doesn't exist
    try {
      const adminUser = await prisma.user.findFirst({
        where: { username: "admin" },
      });

      if (!adminUser) {
        await prisma.user.create({
          data: {
            username: "admin",
            passwordHash: "test-password-hash", // This is just for testing
            isAdmin: true,
          },
        });
        console.log("✓ Created default admin user for testing");
      } else {
        console.log("✓ Default admin user already exists");
      }
    } catch (error) {
      console.error("Error setting up admin user:", error);
      throw error;
    }

    console.log("✓ Test database reset complete");
  } catch (error) {
    console.error("Failed to reset test database:", error);
    throw error;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error disconnecting from database:", err);
    }
  }
}

/**
 * Test data constants matching the seeded data.
 * Use these in tests to ensure consistency with the seeded data.
 */
export const TEST_DATA = {
  groups: {
    development: {
      name: "Development Tools",
      description: "Essential development and debugging tools",
      urls: [
        {
          title: "GitHub Dashboard",
          url: "https://github.com",
          urlMobile: "https://github.com/mobile",
          idleTimeoutMinutes: 30,
        },
        {
          title: "Jenkins CI",
          url: "https://jenkins.example.com",
          idleTimeoutMinutes: 15,
        },
      ],
    },
    monitoring: {
      name: "System Monitoring",
      description: "System monitoring and analytics dashboards",
      urls: [
        {
          title: "Grafana Metrics",
          url: "https://grafana.example.com",
          idleTimeoutMinutes: 5,
        },
        {
          title: "Kibana Logs",
          url: "https://kibana.example.com",
          idleTimeoutMinutes: 10,
        },
        {
          title: "Prometheus Alerts",
          url: "https://prometheus.example.com",
          idleTimeoutMinutes: 2,
        },
      ],
    },
  },
};
