/**
 * Database Configuration
 *
 * This module provides a centralized configuration for database access.
 * It ensures that we use the correct database URLs for different operations.
 */

// Default values for database URLs and backup directory
const DEFAULT_DB_URL = "file:./data/app.db";
const DEFAULT_BACKUP_DIR = "./data/backups";

// Define the type for our database configuration
interface DatabaseConfig {
  runtimeUrl: string;
  directUrl: string;
  backupDir: string;
  cliUrl?: string;
  filePath?: string;
  directory?: string;
  toRuntimeUrl?: (url: string) => string;
  toCliUrl?: (url: string) => string;
  toFilePath?: (url: string) => string;
}

// Ensure the appropriate protocol is used for database URLs
export const DB_CONFIG: DatabaseConfig = {
  // For all database operations, we now use the file: protocol
  runtimeUrl: process.env.DATABASE_URL || DEFAULT_DB_URL,
  directUrl: process.env.DIRECT_DATABASE_URL || DEFAULT_DB_URL,
  backupDir: process.env.DATABASE_BACKUP_DIR || DEFAULT_BACKUP_DIR,

  // Add the toRuntimeUrl method, but have it return file: URLs instead of prisma: URLs
  // This maintains compatibility with existing code that expects this method
  toRuntimeUrl: (url: string): string => {
    // Always ensure it's using file: protocol
    if (url.startsWith("prisma:")) {
      return url.replace(/^prisma:/, "file:");
    }
    return url.startsWith("file:") ? url : `file:${url}`;
  },

  // Add toCliUrl for backward compatibility
  toCliUrl: (url: string): string => {
    if (url.startsWith("prisma:")) {
      return url.replace(/^prisma:/, "file:");
    }
    return url.startsWith("file:") ? url : `file:${url}`;
  },

  // Add toFilePath for backward compatibility
  toFilePath: (url: string): string => {
    return url.replace(/^(file:|prisma:)(\/\/)?/, "");
  },
};

// Make sure both URLs use file: protocol for SQLite
// This helps prevent issues with Prisma Accelerate
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
// CLI URL is the same as the direct URL for command-line operations
DB_CONFIG.cliUrl = DB_CONFIG.directUrl;

// Extract the file path from the URL (removing protocol)
DB_CONFIG.filePath = DB_CONFIG.directUrl.replace(/^(file:|prisma:)(\/\/)?/, "");

// Extract the directory from the file path
const pathParts = DB_CONFIG.filePath.split("/");
pathParts.pop(); // Remove the filename
DB_CONFIG.directory = pathParts.join("/");

// Export the finalized configuration
export default DB_CONFIG;
