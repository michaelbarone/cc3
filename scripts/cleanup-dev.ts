import fs from "fs";
import path from "path";
import { prisma } from "../app/lib/db/prisma";

// Function to recreate directory
function recreateDirectory(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    console.log(`Cleaning directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

async function cleanupDev() {
  try {
    console.log("Starting cleanup process...");

    // 1. Ensure database is disconnected first
    console.log("Disconnecting from database...");
    await prisma.$disconnect();

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

    // 4. Clean public directories
    console.log("Cleaning public directories...");
    const publicDirs = [
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "public", "icons"),
      path.join(process.cwd(), "public", "avatars"),
      path.join(process.cwd(), "public", "logos"),
      path.join(process.cwd(), "public", "favicons"),
    ];

    // Recreate each directory
    for (const dir of publicDirs) {
      try {
        recreateDirectory(dir);
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
