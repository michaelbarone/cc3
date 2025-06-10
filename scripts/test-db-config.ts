#!/usr/bin/env node

/**
 * Test Database Configuration
 *
 * This script tests the database configuration by simulating the directory creation
 * process from init.ts to ensure all necessary fields are available.
 */

import fs from "fs";
import path from "path";

console.log("Testing database configuration...");

// Default values for database URLs and backup directory
const DEFAULT_DB_URL = "file:./data/app.db";
const DEFAULT_BACKUP_DIR = "./data/backups";

// Define the DB_CONFIG interface to avoid type errors
interface DatabaseConfig {
  runtimeUrl: string;
  directUrl: string;
  backupDir: string;
  cliUrl: string;
  filePath: string;
  directory: string;
}

// Initialize with environment variables or defaults
const DB_CONFIG: DatabaseConfig = {
  runtimeUrl: process.env.DATABASE_URL || DEFAULT_DB_URL,
  directUrl: process.env.DIRECT_DATABASE_URL || DEFAULT_DB_URL,
  backupDir: process.env.DATABASE_BACKUP_DIR || DEFAULT_BACKUP_DIR,
  cliUrl: "", // Will be set below
  filePath: "", // Will be set below
  directory: "", // Will be set below
};

// Make sure both URLs use file: protocol for SQLite
if (DB_CONFIG.runtimeUrl.startsWith("prisma:")) {
  console.log(`Converting runtime URL from prisma:// to file: protocol`);
  DB_CONFIG.runtimeUrl = DB_CONFIG.runtimeUrl.replace(/^prisma:/, "file:");
}

if (DB_CONFIG.directUrl.startsWith("prisma:")) {
  console.log(`Converting direct URL from prisma:// to file: protocol`);
  DB_CONFIG.directUrl = DB_CONFIG.directUrl.replace(/^prisma:/, "file:");
}

// Make sure both URLs are the same, preferring the direct URL
if (DB_CONFIG.directUrl !== DB_CONFIG.runtimeUrl) {
  console.log(`Making runtime URL match direct URL: ${DB_CONFIG.directUrl}`);
  DB_CONFIG.runtimeUrl = DB_CONFIG.directUrl;
}

// Ensure environment variable is set to disable Prisma Accelerate
process.env.PRISMA_ACCELERATE_DISABLED = "true";

// Add additional derived properties needed by init.ts
DB_CONFIG.cliUrl = DB_CONFIG.directUrl;

// Extract the file path from the URL (removing protocol)
DB_CONFIG.filePath = DB_CONFIG.directUrl.replace(/^(file:|prisma:)(\/\/)?/, "");

// Extract the directory from the file path
const pathParts = DB_CONFIG.filePath.split("/");
pathParts.pop(); // Remove the filename
DB_CONFIG.directory = pathParts.join("/");

// Log all the DB_CONFIG properties
console.log("DB_CONFIG properties:");
console.log("runtimeUrl:", DB_CONFIG.runtimeUrl);
console.log("directUrl:", DB_CONFIG.directUrl);
console.log("backupDir:", DB_CONFIG.backupDir);
console.log("cliUrl:", DB_CONFIG.cliUrl);
console.log("filePath:", DB_CONFIG.filePath);
console.log("directory:", DB_CONFIG.directory);

// Simulate the directory creation process from init.ts
function testDirectoryCreation() {
  console.log("\nSimulating directory creation...");

  const directories = [
    "./data", // Ensure root data directory exists
    DB_CONFIG.directory, // Database directory
    DB_CONFIG.backupDir, // Backup directory
    "public/uploads",
    "public/icons",
    "public/avatars",
    "public/logos",
    "public/favicons",
  ];

  directories.forEach((dir) => {
    try {
      if (!dir) {
        console.error(`ERROR: Directory path is ${dir}`);
        return;
      }

      // Normalize the directory path to handle any format issues
      const normalizedDir = dir.replace(/^(file:|prisma:)(\/\/)?/, "");

      // Create absolute path
      const dirPath = path.isAbsolute(normalizedDir)
        ? normalizedDir
        : path.join(process.cwd(), normalizedDir);

      console.log(`Ensuring directory exists: ${dirPath}`);

      // Just test if we can get this far without errors
      console.log("Path processing successful for:", dirPath);

      // Check if directory exists (but don't create it)
      if (fs.existsSync(dirPath)) {
        console.log(`Directory already exists: ${dirPath}`);
      } else {
        console.log(`Directory would be created: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  });
}

// Run the test
testDirectoryCreation();

console.log("\nTest completed successfully!");
