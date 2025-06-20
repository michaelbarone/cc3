import fs from "fs";
import path from "path";
import { prisma } from "../app/lib/db/prisma";

// Define public directories that need to be cleaned
const publicDirs = [
  path.join(process.cwd(), "public", "uploads"),
  path.join(process.cwd(), "public", "icons"),
  path.join(process.cwd(), "public", "avatars"),
  path.join(process.cwd(), "public", "logos"),
];

// Function to check if a file is a default file
function isDefaultFile(filePath: string): boolean {
  return filePath.includes("-default.");
}

// Function to clean non-default files in a directory
function cleanNonDefaultFiles(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      cleanNonDefaultFiles(filePath); // Recursively clean subdirectories
      // Remove directory if it's empty and not a base public directory
      const remainingFiles = fs.readdirSync(filePath);
      if (remainingFiles.length === 0 && !publicDirs.includes(filePath)) {
        fs.rmdirSync(filePath);
      }
    } else if (!isDefaultFile(file)) {
      console.log(`Removing non-default file: ${filePath}`);
      fs.unlinkSync(filePath);
    } else {
      console.log(`Preserving default file: ${filePath}`);
    }
  }
}

async function cleanupDev() {
  try {
    console.log("Starting cleanup process...");

    // 1. Ensure database is disconnected first
    console.log("Disconnecting from database...");
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }

  try {
    // 2. Delete the development database
    const dbPath = path.join(process.cwd(), "prisma", "data", "app.db");
    if (fs.existsSync(dbPath)) {
      console.log("Removing development database...");
      try {
        fs.unlinkSync(dbPath);
        console.log("Database file removed successfully!");
      } catch (err) {
        console.error("Error removing database file:", err);
        throw err;
      }
    } else {
      console.log("No database file found at:", dbPath);
    }

    // 3. Ensure the data directory exists for future database creation
    const dataDir = path.join(process.cwd(), "prisma", "data");
    if (!fs.existsSync(dataDir)) {
      console.log("Creating data directory...");
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 4. Define and clean public directories
    console.log("Cleaning public directories...");

    // Clean each directory while preserving default files
    for (const dir of publicDirs) {
      try {
        cleanNonDefaultFiles(dir);
        console.log(`Successfully cleaned directory: ${dir}`);
      } catch (err) {
        console.error(`Error cleaning directory ${dir}:`, err);
        throw err;
      }
    }

    // 5. Delete SQLite journal files if they exist
    const journalPath = path.join(process.cwd(), "prisma", "data", "app.db-journal");
    if (fs.existsSync(journalPath)) {
      console.log("Removing database journal...");
      try {
        fs.unlinkSync(journalPath);
        console.log("Database journal removed successfully!");
      } catch (err) {
        console.error("Error removing database journal:", err);
        throw err;
      }
    }

    // 6. Clean .next directory
    const nextDir = path.join(process.cwd(), ".next");
    if (fs.existsSync(nextDir)) {
      console.log("Removing Next.js build directory...");
      try {
        fs.rmSync(nextDir, { recursive: true, force: true });
        console.log(".next directory removed successfully!");
      } catch (err) {
        console.error("Error removing .next directory:", err);
        throw err;
      }
    }

    console.log("\nDevelopment resources cleaned successfully!");
    console.log("\nNext steps:");
    console.log("1. Run 'npm run db:migrate' to initialize the database schema");
    console.log("2. Run 'npm run db:seed' to populate with initial data");
    console.log("3. Run 'npm run dev' to start the development server");
  } catch (error) {
    console.error("\nError during cleanup:", error);
    console.log("\nTroubleshooting steps:");
    console.log("1. Ensure no processes are using the database file");
    console.log("2. Check file permissions in the project directories");
    console.log("3. Try running the terminal as administrator");
    process.exit(1);
  } finally {
    // Ensure database is always disconnected
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error disconnecting from database:", err);
    }
  }
}

// Run the cleanup
console.log("Starting development cleanup script...");
cleanupDev().catch((err) => {
  console.error("Fatal error during cleanup:", err);
  process.exit(1);
});
