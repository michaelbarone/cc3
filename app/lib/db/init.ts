import { prisma } from "@/app/lib/db/prisma";
import { main as seedDatabase } from "@/prisma/seed";
import { Prisma } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Flag to ensure we only try to initialize once per process
let isInitializing = false;
let isInitialized = false;

// Create required directories if they don't exist
function createRequiredDirectories() {
  const directories = [
    "data",
    "data/backups",
    "public/uploads",
    "public/icons",
    "public/avatars",
    "public/logos",
    "public/favicons",
  ];

  directories.forEach((dir) => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  });
}

// Function to check if database exists and is accessible
async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
}

export async function initializeDatabase() {
  // Return if already initialized
  if (isInitialized) {
    return;
  }

  // Prevent concurrent initialization attempts
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  isInitializing = true;

  try {
    // Create all required directories
    createRequiredDirectories();

    // Check if database exists and is accessible
    const dbExists = await checkDatabase();

    if (!dbExists) {
      console.log("Database not accessible, running migrations...");
      // Run migrations
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
    }

    // Check if we need to seed
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      console.log("Database is empty. Running initial seed...");
      await seedDatabase();
    }

    console.log("Database initialization completed successfully");
    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

// Initialize database on module import
initializeDatabase().catch(console.error);

// Function to seed test data - can be called manually when needed
export async function seedTestData() {
  try {
    console.log("Starting test data seeding...");

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create URL groups first
      const devGroup = await tx.urlGroup.create({
        data: {
          name: "Development Tools",
          description: "Essential development and debugging tools",
        },
      });

      const monitoringGroup = await tx.urlGroup.create({
        data: {
          name: "System Monitoring",
          description: "System monitoring and analytics dashboards",
        },
      });

      // Create URLs with their data
      const urls = await Promise.all([
        tx.url.create({
          data: {
            title: "GitHub Dashboard",
            url: "https://github.com",
            urlMobile: "https://github.com/mobile",
            idleTimeoutMinutes: 30,
          },
        }),
        tx.url.create({
          data: {
            title: "Jenkins CI",
            url: "https://jenkins.example.com",
            idleTimeoutMinutes: 15,
          },
        }),
        tx.url.create({
          data: {
            title: "Grafana Metrics",
            url: "https://grafana.example.com",
            idleTimeoutMinutes: 5,
          },
        }),
        tx.url.create({
          data: {
            title: "Kibana Logs",
            url: "https://kibana.example.com",
            idleTimeoutMinutes: 10,
          },
        }),
        tx.url.create({
          data: {
            title: "Prometheus Alerts",
            url: "https://prometheus.example.com",
            idleTimeoutMinutes: 2,
          },
        }),
      ]);

      // Create URL-Group relationships with display orders
      await Promise.all([
        // Development Tools group URLs
        tx.urlsInGroups.create({
          data: {
            urlId: urls[0].id,
            groupId: devGroup.id,
            displayOrder: 0,
          },
        }),
        tx.urlsInGroups.create({
          data: {
            urlId: urls[1].id,
            groupId: devGroup.id,
            displayOrder: 1,
          },
        }),
        // Monitoring group URLs
        tx.urlsInGroups.create({
          data: {
            urlId: urls[2].id,
            groupId: monitoringGroup.id,
            displayOrder: 0,
          },
        }),
        tx.urlsInGroups.create({
          data: {
            urlId: urls[3].id,
            groupId: monitoringGroup.id,
            displayOrder: 1,
          },
        }),
        tx.urlsInGroups.create({
          data: {
            urlId: urls[4].id,
            groupId: monitoringGroup.id,
            displayOrder: 2,
          },
        }),
      ]);

      // Find admin user
      const admin = await tx.user.findFirst({
        where: { username: "admin" },
      });

      if (admin) {
        // Assign groups to admin user
        await Promise.all([
          tx.userUrlGroup.create({
            data: {
              userId: admin.id,
              urlGroupId: devGroup.id,
            },
          }),
          tx.userUrlGroup.create({
            data: {
              userId: admin.id,
              urlGroupId: monitoringGroup.id,
            },
          }),
        ]);
      }
    });

    console.log("Test data seeded successfully");
  } catch (error) {
    console.error("Error seeding test data:", error);
    throw error;
  }
}
