import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Cleans up development environment by:
 * 1. Deleting the SQLite database file
 * 2. Resetting image upload folders (avatars, branding, url_favicons)
 * 3. Preserving necessary folder structures
 */
async function cleanup() {
  console.log("Starting development environment cleanup...");

  // 1. Disconnect and close Prisma client
  console.log("Disconnecting Prisma client...");
  await prisma.$disconnect();

  // 2. Delete SQLite database files
  const dbPaths = [
    path.join(process.cwd(), "prisma", "data", "dev.db"),
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), "prisma", "data", "controlcenter.db"),
    path.join(process.cwd(), "data", "app.db"),
  ];

  let dbFound = false;

  for (const dbPath of dbPaths) {
    try {
      if (fs.existsSync(dbPath)) {
        console.log(`Deleting database file: ${dbPath}`);
        fs.unlinkSync(dbPath);
        console.log(`Database file ${dbPath} deleted successfully.`);
        dbFound = true;
      }
    } catch (error) {
      console.error(
        `Error deleting database file ${dbPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!dbFound) {
    console.log("No database files found to delete.");
  }

  // 3. Clean image upload folders
  const imageFolders = [
    path.join(process.cwd(), "public", "avatars"),
    path.join(process.cwd(), "public", "branding"),
    path.join(process.cwd(), "public", "url_favicons"),
  ];

  for (const folder of imageFolders) {
    try {
      console.log(`Cleaning folder: ${folder}`);

      // Create folder if it doesn't exist
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`Created folder: ${folder}`);
        continue;
      }

      // Read all files in the directory
      const files = fs.readdirSync(folder);

      // Delete each file in the directory
      for (const file of files) {
        // Skip .gitkeep files which are used to preserve directory structure in git
        if (file === ".gitkeep") {
          console.log(`Keeping ${file} in ${folder}`);
          continue;
        }

        const filePath = path.join(folder, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Recursively delete all files in subdirectories
          fs.rmSync(filePath, { recursive: true, force: true });
          console.log(`Deleted subdirectory: ${filePath}`);
        } else {
          // Delete file
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      }

      // Ensure .gitkeep exists in each folder to preserve directory structure
      const gitkeepPath = path.join(folder, ".gitkeep");
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, "");
        console.log(`Created .gitkeep in ${folder}`);
      }
    } catch (error) {
      console.error(
        `Error cleaning folder ${folder}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 4. Clean data/backups folder but preserve structure
  const backupsFolder = path.join(process.cwd(), "data", "backups");
  try {
    console.log(`Cleaning folder: ${backupsFolder}`);

    // Create folder if it doesn't exist
    if (!fs.existsSync(backupsFolder)) {
      fs.mkdirSync(backupsFolder, { recursive: true });
      console.log(`Created folder: ${backupsFolder}`);
    } else {
      // Read all files in the directory
      const files = fs.readdirSync(backupsFolder);

      // Delete each file in the directory
      for (const file of files) {
        // Skip .gitkeep files
        if (file === ".gitkeep") {
          continue;
        }

        const filePath = path.join(backupsFolder, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }

    // Ensure .gitkeep exists
    const gitkeepPath = path.join(backupsFolder, ".gitkeep");
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, "");
      console.log(`Created .gitkeep in ${backupsFolder}`);
    }
  } catch (error) {
    console.error(
      `Error cleaning backups folder: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log("Cleanup completed successfully!");
  console.log("To reset the database, run: npm run db:migrate");
}

// Run the cleanup function
cleanup().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
