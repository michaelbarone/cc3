import path from "path";

// More reliable environment detection
const getNodeEnv = () => {
  // Log the raw value for debugging
  console.log(`Raw NODE_ENV value: "${process.env.NODE_ENV}"`);

  // Check if we're running the dev script
  const isDevCommand = process.argv.some((arg) => arg.includes("dev"));

  // Default to development if running dev command or if NODE_ENV is undefined
  if (isDevCommand || !process.env.NODE_ENV) {
    return "development";
  }

  return process.env.NODE_ENV;
};

// Determine the database directory based on environment
const nodeEnv = getNodeEnv();
const isDevelopment = nodeEnv === "development" && !process.env.DOCKER_CONTAINER;
const isTest = nodeEnv === "test";

// Base paths - Different handling for local development vs Docker
export const DB_DIRECTORY = isDevelopment
  ? "./data" // Local development: ./data
  : "/data"; // Docker: /data

// For SQLite URLs, we need to preserve the exact format including "./" for relative paths
// Use path.join for file system operations, but construct the URL path manually
export const DATABASE_FILENAME = "app.db";
export const DATABASE_PATH = isDevelopment
  ? `./data/${DATABASE_FILENAME}` // Preserve exact "./data" format for SQLite URL
  : path.join(DB_DIRECTORY, DATABASE_FILENAME); // Use path.join for absolute paths

export const BACKUP_DIRECTORY = path.join(DB_DIRECTORY, "backups");

// Database URLs
// For Prisma migrations - needs the file: protocol
export const MIGRATION_DATABASE_URL = `file:${DATABASE_PATH}`;
// For application usage - direct path or file: protocol based on SQLite requirements
export const APP_DATABASE_URL = MIGRATION_DATABASE_URL;

// Test specific paths
export const TEST_DATABASE_PATH = isTest
  ? path.join(process.cwd(), "test-data", "app.db") // Local test: ./test-data/app.db
  : "/test/data/app.db"; // Docker test: /test/data/app.db
export const TEST_DATABASE_URL = `file:${TEST_DATABASE_PATH}`;

// Backup utilities
export const getBackupPath = (timestamp: string) =>
  path.join(BACKUP_DIRECTORY, `app_${timestamp}.db`);

// For debugging
console.log("Database Configuration:");
console.log(`- Detected NODE_ENV: ${nodeEnv}`);
console.log(`- Is Development: ${isDevelopment}`);
console.log(`- Docker Container: ${process.env.DOCKER_CONTAINER ? "Yes" : "No"}`);
console.log(`- DB_DIRECTORY: ${DB_DIRECTORY}`);
console.log(`- DATABASE_PATH: ${DATABASE_PATH}`);
console.log(`- MIGRATION_DATABASE_URL: ${MIGRATION_DATABASE_URL}`);

// Environment-aware database URL getter
export const getDatabaseUrl = () => {
  // For test environment
  if (nodeEnv === "test") {
    return process.env.TEST_DATABASE_URL || TEST_DATABASE_URL;
  }

  // Standard for all environments
  return APP_DATABASE_URL;
};

// Get proper URL format for Prisma migrations
export const getMigrationDatabaseUrl = () => {
  // For test environment
  if (nodeEnv === "test") {
    return process.env.TEST_DATABASE_URL || TEST_DATABASE_URL;
  }

  // Standard for all environments
  return MIGRATION_DATABASE_URL;
};
