import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

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
    // 1. Delete the development database
    const dbPath = path.join(process.cwd(), "prisma", "data", "app.db");
    if (fs.existsSync(dbPath)) {
      console.log("Removing development database...");
      await prisma.$disconnect(); // Ensure database connection is closed
      fs.unlinkSync(dbPath);
    }

    // Ensure the data directory exists for future database creation
    const dataDir = path.join(process.cwd(), "prisma", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 2. Clean public directories
    const publicDirs = [
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "public", "icons"),
      path.join(process.cwd(), "public", "avatars"),
      path.join(process.cwd(), "public", "logos"),
      path.join(process.cwd(), "public", "favicons"),
    ];

    // Recreate each directory
    publicDirs.forEach((dir) => {
      recreateDirectory(dir);
    });

    // 3. Delete SQLite journal files if they exist
    const journalPath = path.join(process.cwd(), "prisma", "data", "app.db-journal");
    if (fs.existsSync(journalPath)) {
      console.log("Removing database journal...");
      fs.unlinkSync(journalPath);
    }

    console.log("Development resources cleaned successfully!");
    console.log(
      "Optional: Run `npm run db:migrate` and `npm run db:seed` to manually reinitialize the database.",
    );
    console.log(
      "Run `npm run dev` to automatically reinitialize the database and start the development server.",
    );
  } catch (error) {
    console.error("Error cleaning development resources:", error);
    process.exit(1);
  }
}

cleanupDev();
