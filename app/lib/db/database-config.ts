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

// Force using file: protocol
const enforceFileProtocol = (url: string): string => {
  if (!url) return DEFAULT_DB_URL;
  // Always convert to file: protocol regardless of input
  return url.replace(/^(prisma:|postgres:|mysql:|mongodb:|sqlserver:)(\/\/)?/, "file:");
};

// Get the initial URLs from environment or defaults
const rawRuntimeUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;
const rawDirectUrl = process.env.DIRECT_DATABASE_URL || DEFAULT_DB_URL;

// Force file: protocol for all URLs
const runtimeUrl = enforceFileProtocol(rawRuntimeUrl);
const directUrl = enforceFileProtocol(rawDirectUrl);

// Update environment variables to match
process.env.DATABASE_URL = runtimeUrl;
process.env.DIRECT_DATABASE_URL = directUrl;
process.env.PRISMA_ACCELERATE_DISABLED = "true";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

// Ensure the appropriate protocol is used for database URLs
export const DB_CONFIG: DatabaseConfig = {
  // For all database operations, we now use the file: protocol
  runtimeUrl,
  directUrl,
  backupDir: process.env.DATABASE_BACKUP_DIR || DEFAULT_BACKUP_DIR,

  // Force file: protocol for all URLs
  toRuntimeUrl: (url: string): string => {
    return enforceFileProtocol(url);
  },

  // Force file: protocol for CLI URLs
  toCliUrl: (url: string): string => {
    return enforceFileProtocol(url);
  },

  // Extract file path by removing protocol
  toFilePath: (url: string): string => {
    return url.replace(/^(file:|prisma:)(\/\/)?/, "");
  },
};

// Logging only in non-production environments
if (process.env.NODE_ENV !== "production") {
  console.log("Database URLs configured:");
  console.log(`- Runtime URL: ${DB_CONFIG.runtimeUrl}`);
  console.log(`- Direct URL: ${DB_CONFIG.directUrl}`);
}

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
