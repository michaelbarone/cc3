import path from "path";

// Base paths
export const DB_DIRECTORY = path.join(process.cwd(), "data");
export const DATABASE_PATH = path.join(DB_DIRECTORY, "app.db");
export const BACKUP_DIRECTORY = path.join(DB_DIRECTORY, "backups");

// Database URLs
// For Prisma migrations - needs the file: protocol
export const MIGRATION_DATABASE_URL = `file:${DATABASE_PATH}`;
// For application usage - direct path or file: protocol based on SQLite requirements
export const APP_DATABASE_URL = MIGRATION_DATABASE_URL;

// Docker-specific paths
export const DOCKER_DB_PATH = "/app/data/app.db";
export const DOCKER_DATABASE_URL = `file:${DOCKER_DB_PATH}`;

// Backup utilities
export const getBackupPath = (timestamp: string) =>
  path.join(BACKUP_DIRECTORY, `app_${timestamp}.db`);

// Environment-aware database URL getter
export const getDatabaseUrl = () => {
  // For Docker environment
  if (process.env.NODE_ENV === "production" && process.env.DOCKER_CONTAINER) {
    return DOCKER_DATABASE_URL;
  }

  // For test environment
  if (process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  // Default for local development
  return APP_DATABASE_URL;
};

// Get proper URL format for Prisma migrations
export const getMigrationDatabaseUrl = () => {
  // For Docker environment
  if (process.env.NODE_ENV === "production" && process.env.DOCKER_CONTAINER) {
    return DOCKER_DATABASE_URL;
  }

  // For test environment
  if (process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  // Default for local development
  return MIGRATION_DATABASE_URL;
};
