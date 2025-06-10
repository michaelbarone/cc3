#!/usr/bin/env node

/**
 * Environment Setup Script
 *
 * This script sets up the environment for the application to run properly.
 * It ensures that all necessary environment variables are set and are consistent.
 */

import * as fs from "fs";
import * as path from "path";

// Define configuration types
interface EnvironmentConfig {
  DATABASE_URL: string;
  DIRECT_DATABASE_URL: string;
  DATABASE_BACKUP_DIR: string;
  PRISMA_ACCELERATE_DISABLED: string;
  NODE_ENV: string;
  [key: string]: string;
}

// Default configurations - using simplified approach with only file: URL
const DEFAULT_CONFIG: EnvironmentConfig = {
  DATABASE_URL: "file:./data/app.db", // Now using file: protocol for all operations
  DIRECT_DATABASE_URL: "file:./data/app.db",
  DATABASE_BACKUP_DIR: "./data/backups",
  PRISMA_ACCELERATE_DISABLED: "true",
  NODE_ENV: process.env.NODE_ENV || "production",
};

// Initialize environment
function initializeEnv(): void {
  console.log("Initializing environment variables...");

  // Create .env file if it doesn't exist
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    console.log("Creating new .env file...");
    const envContent = Object.entries(DEFAULT_CONFIG)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    fs.writeFileSync(envPath, envContent);
    console.log(".env file created successfully");
  } else {
    console.log("Updating existing .env file...");
    // Read existing file
    let envContent = fs.readFileSync(envPath, "utf8");

    // Check for each required variable
    let updated = false;
    Object.entries(DEFAULT_CONFIG).forEach(([key, defaultValue]) => {
      const regex = new RegExp(`^${key}=.*$`, "m");

      if (!regex.test(envContent)) {
        envContent += `\n${key}=${defaultValue}`;
        console.log(`Added missing variable: ${key}=${defaultValue}`);
        updated = true;
      }
    });

    // Ensure PRISMA_ACCELERATE_DISABLED is set to true
    if (!envContent.includes("PRISMA_ACCELERATE_DISABLED=true")) {
      envContent = envContent.replace(
        /PRISMA_ACCELERATE_DISABLED=.*/,
        "PRISMA_ACCELERATE_DISABLED=true",
      );
      if (!envContent.includes("PRISMA_ACCELERATE_DISABLED")) {
        envContent += "\nPRISMA_ACCELERATE_DISABLED=true";
      }
      updated = true;
    }

    // Ensure both DATABASE_URL and DIRECT_DATABASE_URL use file: protocol
    if (envContent.includes("DATABASE_URL=prisma:")) {
      envContent = envContent.replace(/DATABASE_URL=prisma:(.*)/, "DATABASE_URL=file:$1");
      updated = true;
      console.log("Fixed DATABASE_URL to use file: protocol");
    }

    if (envContent.includes("DIRECT_DATABASE_URL=prisma:")) {
      envContent = envContent.replace(
        /DIRECT_DATABASE_URL=prisma:(.*)/,
        "DIRECT_DATABASE_URL=file:$1",
      );
      updated = true;
      console.log("Fixed DIRECT_DATABASE_URL to use file: protocol");
    }

    // Make DATABASE_URL match DIRECT_DATABASE_URL
    const directUrlMatch = envContent.match(/DIRECT_DATABASE_URL=([^\n]*)/);
    if (directUrlMatch) {
      const directUrl = directUrlMatch[1];
      envContent = envContent.replace(/DATABASE_URL=([^\n]*)/, `DATABASE_URL=${directUrl}`);
      updated = true;
      console.log("Made DATABASE_URL match DIRECT_DATABASE_URL");
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log(".env file updated successfully");
    } else {
      console.log(".env file already contains all required variables");
    }
  }

  // Ensure these environment variables are available to the current process
  Object.entries(DEFAULT_CONFIG).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`Set process.env.${key}=${value}`);
    }
  });

  // Make sure environment variables have correct protocols
  if (process.env.DATABASE_URL?.startsWith("prisma:")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("prisma:", "file:");
    console.log("Fixed process.env.DATABASE_URL to use file: protocol");
  }

  if (process.env.DIRECT_DATABASE_URL?.startsWith("prisma:")) {
    process.env.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL.replace("prisma:", "file:");
    console.log("Fixed process.env.DIRECT_DATABASE_URL to use file: protocol");
  }

  // Make sure DATABASE_URL matches DIRECT_DATABASE_URL
  if (
    process.env.DIRECT_DATABASE_URL &&
    process.env.DATABASE_URL !== process.env.DIRECT_DATABASE_URL
  ) {
    process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
    console.log("Made process.env.DATABASE_URL match process.env.DIRECT_DATABASE_URL");
  }

  console.log("Environment initialization complete");
}

// Create required directories
function createRequiredDirectories(): void {
  console.log("Creating required directories...");

  // Extract the database path from the URL (prefer DIRECT_DATABASE_URL as it uses file:)
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "file:./data/app.db";
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

// Main function
function main(): void {
  console.log("Starting environment setup...");

  try {
    // Initialize environment variables
    initializeEnv();

    // Create required directories
    createRequiredDirectories();

    console.log("Environment setup completed successfully");
  } catch (error) {
    console.error("Error during environment setup:", error);
    process.exit(1);
  }
}

// Run the main function
main();
