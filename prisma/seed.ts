import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Define configuration types
type DatabaseConfig = {
  runtimeUrl: string;
  directUrl: string;
  backupDir: string;
};

// Load database configuration without importing from app
function getDatabaseConfig(): DatabaseConfig {
  // Default values - use file: protocol consistently
  const defaultRuntimeUrl = "file:./data/app.db";
  const defaultDirectUrl = "file:./data/app.db";
  const defaultBackupDir = "./data/backups";

  // Get values from environment or use defaults
  let runtimeUrl = process.env.DATABASE_URL || defaultRuntimeUrl;
  const directUrl = process.env.DIRECT_DATABASE_URL || defaultDirectUrl;
  const backupDir = process.env.DATABASE_BACKUP_DIR || defaultBackupDir;

  // Ensure runtime URL uses file: protocol for consistency
  if (runtimeUrl.startsWith("prisma:")) {
    runtimeUrl = runtimeUrl.replace(/^prisma:/, "file:");
  }

  console.log("Database configuration:");
  console.log(`Runtime URL: ${runtimeUrl}`);
  console.log(`Direct URL: ${directUrl}`);

  return {
    runtimeUrl,
    directUrl,
    backupDir,
  };
}

// Use the appropriate URL based on the operation type
// For all operations, we'll use the direct URL
const { directUrl } = getDatabaseConfig();

// Make sure Prisma Accelerate is disabled
process.env.PRISMA_ACCELERATE_DISABLED = "true";

// Configure PrismaClient with direct URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl, // Always use the direct file: URL
    },
  },
});

// Hash password function
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Function to create required directories
function createRequiredDirectories() {
  // Extract the database path from the URL
  const dbUrl = directUrl;
  // Remove protocol and leading slashes
  const dbPath = dbUrl.replace(/^(prisma:|file:)(\/\/)?/, "");
  // Get the directory containing the database
  const dbDir = path.dirname(dbPath);
  // Get backup directory
  const backupDir = process.env.DATABASE_BACKUP_DIR || "./data/backups";

  // List of directories to ensure exist
  const directories = [
    "./data",
    dbDir,
    backupDir,
    "public/uploads",
    "public/icons",
    "public/logos",
    "public/avatars",
  ];

  // Create each directory if it doesn't exist
  directories.forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create directory ${dir}:`, error);
    }
  });
}

async function seed() {
  try {
    console.log("Starting database seed...");
    console.log(`Using database URL: ${directUrl}`);

    // Create required directories first
    console.log("Creating required directories...");
    createRequiredDirectories();

    // Check if admin user already exists
    const adminExists = await prisma.user.findFirst({
      where: {
        isAdmin: true,
      },
    });

    if (adminExists) {
      console.log("Admin user already exists, skipping user creation");
      return;
    }

    console.log("Creating admin user...");

    // Create admin user based on the actual schema
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashPassword("admin"),
        isAdmin: true,
        menuPosition: "left",
        themeMode: "light",
      },
    });

    // Create app configuration based on the actual schema
    console.log("Creating default app configuration...");
    await prisma.appConfig.create({
      data: {
        id: "app-config",
        appName: "Connected Cards",
        loginTheme: "light",
        registrationEnabled: true,
      },
    });

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error during seed operation:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed function
seed().catch((e) => {
  console.error("Seed failed:");
  console.error(e);
  process.exit(1);
});

// Don't run this twice
if (require.main === module) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
