import { BACKUP_DIRECTORY, DATABASE_PATH } from "@/app/lib/db/constants";
import archiver from "archiver";
import extract from "extract-zip";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

// Types for archive operations
export interface ArchiveOptions {
  sourceDir: string;
  targetFile: string;
  include?: string[];
  exclude?: string[];
}

export interface ExtractOptions {
  sourceFile: string;
  targetDir: string;
  onProgress?: (progress: number) => void;
}

/**
 * Gets the database path using the standardized location from constants
 */
function getDatabasePath(): string {
  // Use the standardized path from constants
  console.log("Using standardized database path:", DATABASE_PATH);

  // Ensure the database directory exists
  const dbDir = path.dirname(DATABASE_PATH);
  if (!fsSync.existsSync(dbDir)) {
    fsSync.mkdirSync(dbDir, { recursive: true });
    console.log("Created database directory at:", dbDir);
  }

  return DATABASE_PATH;
}

/**
 * Gets the backup directory from constants
 */
function getBackupDir(): string {
  // Use the standardized backup directory from constants

  // Ensure the backup directory exists
  if (!fsSync.existsSync(BACKUP_DIRECTORY)) {
    fsSync.mkdirSync(BACKUP_DIRECTORY, { recursive: true });
    console.log("Created backup directory at:", BACKUP_DIRECTORY);
  }

  return BACKUP_DIRECTORY;
}

/**
 * Creates a zip archive from specified directories and files
 */
export async function createArchive(options: ArchiveOptions): Promise<void> {
  const { sourceDir, targetFile, include = [], exclude = [] } = options;

  // Create the target directory if it doesn't exist
  await fs.mkdir(path.dirname(targetFile), { recursive: true });

  // Copy public files to temp directory if they exist
  const publicDirs = ["icons", "avatars", "logos"];
  for (const dir of publicDirs) {
    const sourcePath = path.join(process.cwd(), "public", dir);
    const targetPath = path.join(sourceDir, "public", dir);

    try {
      if (fsSync.existsSync(sourcePath)) {
        await fs.mkdir(targetPath, { recursive: true });
        // Copy directory contents
        const files = await fs.readdir(sourcePath);
        for (const file of files) {
          await fs.copyFile(path.join(sourcePath, file), path.join(targetPath, file));
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not copy ${dir} directory:`, error);
    }
  }

  // Copy favicon if it exists
  try {
    const faviconFiles = fsSync
      .readdirSync(path.join(process.cwd(), "public"))
      .filter((file) => file.startsWith("favicon"));
    for (const file of faviconFiles) {
      const sourcePath = path.join(process.cwd(), "public", file);
      const targetPath = path.join(sourceDir, "public", file);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }
  } catch (error) {
    console.warn("Warning: Could not copy favicon files:", error);
  }

  return new Promise((resolve, reject) => {
    const output = fsSync.createWriteStream(targetFile);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on("close", () => resolve());
    archive.on("error", (err: Error) => reject(err));

    archive.pipe(output);

    // Add specific files/directories if provided
    if (include.length > 0) {
      for (const item of include) {
        archive.glob(item, {
          cwd: sourceDir,
          ignore: exclude,
        });
      }
    } else {
      // Add everything except excluded items
      archive.glob("**/*", {
        cwd: sourceDir,
        ignore: exclude,
      });
    }

    archive.finalize();
  });
}

/**
 * Extracts a zip archive to the specified directory
 */
export async function extractArchive(options: ExtractOptions): Promise<void> {
  const { sourceFile, targetDir, onProgress } = options;

  // Create the target directory if it doesn't exist
  await fs.mkdir(targetDir, { recursive: true });

  // Get the total size of the zip file for progress calculation
  const stats = await fs.stat(sourceFile);
  const totalSize = stats.size;

  await extract(sourceFile, {
    dir: targetDir,
    onEntry: onProgress
      ? (entry) => {
          // Calculate rough progress based on compressed size
          const progress = Math.min((entry.compressedSize / totalSize) * 100, 100);
          onProgress(progress);
        }
      : undefined,
  });
}

/**
 * Validates a zip file by checking its contents
 */
export async function validateArchive(filePath: string): Promise<boolean> {
  try {
    const tempDir = path.join(process.cwd(), "temp", "validate");
    await fs.mkdir(tempDir, { recursive: true });

    // Try to extract the first entry to validate
    await extract(filePath, {
      dir: tempDir,
      onEntry: () => {
        // Stop after first entry
        throw new Error("VALIDATION_COMPLETE");
      },
    });

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    return true;
  } catch (error) {
    // If error is our validation complete signal, return true
    if (error instanceof Error && error.message === "VALIDATION_COMPLETE") {
      await fs.rm(path.join(process.cwd(), "temp", "validate"), { recursive: true, force: true });
      return true;
    }

    console.error("Failed to validate archive:", error);
    return false;
  }
}

/**
 * Creates a backup of the database and uploads
 */
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = getBackupDir();
  const backupFile = path.join(backupDir, `backup-${timestamp}.zip`);
  const dbPath = getDatabasePath();

  // Verify database exists
  if (!fsSync.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}. Cannot create backup.`);
  }

  // Create a temporary directory for organizing files
  const tempDir = path.join(process.cwd(), "temp", "backup");
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Copy database to temp directory with consistent path
    const tempDbPath = path.join(tempDir, path.relative("/", DATABASE_PATH));
    await fs.mkdir(path.dirname(tempDbPath), { recursive: true });
    await fs.copyFile(dbPath, tempDbPath);

    // Create the archive from the temp directory
    await createArchive({
      sourceDir: tempDir,
      targetFile: backupFile,
      include: [
        path.relative("/", DATABASE_PATH),
        "public/icons/**",
        "public/avatars/**",
        "public/logos/**",
        "public/favicon*",
      ],
      exclude: ["node_modules/**", ".git/**", "temp/**"],
    });

    return backupFile;
  } finally {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
  }
}

/**
 * Recursively copies a directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  // Create destination directory
  await fs.mkdir(dest, { recursive: true });

  // Read source directory
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy directory
      await copyDir(srcPath, destPath);
    } else {
      // Copy file
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Restores a backup from a zip file
 */
export async function restoreBackup(
  sourceFile: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const tempDir = path.join(process.cwd(), "temp", "restore");

  try {
    // Clean up any existing temp directory
    if (fsSync.existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    // Extract to temporary directory first
    await extractArchive({
      sourceFile,
      targetDir: tempDir,
      onProgress,
    });

    // Handle database file first
    const dbSrc = path.join(tempDir, path.relative("/", DATABASE_PATH));
    const dbDest = getDatabasePath();

    if (fsSync.existsSync(dbSrc)) {
      // Ensure target directory exists
      await fs.mkdir(path.dirname(dbDest), { recursive: true });

      try {
        // Try to copy the database file
        await fs.copyFile(dbSrc, dbDest);
        console.log("Database restored successfully");
      } catch (error) {
        console.error("Failed to restore database:", error);
        throw new Error("Failed to restore database. The database may be in use.");
      }
    }

    // Handle public directories
    const publicDirs = ["icons", "avatars", "logos"];
    for (const dir of publicDirs) {
      const srcDir = path.join(tempDir, "public", dir);
      const destDir = path.join(process.cwd(), "public", dir);

      if (fsSync.existsSync(srcDir)) {
        try {
          // Remove existing directory if it exists
          if (fsSync.existsSync(destDir)) {
            await fs.rm(destDir, { recursive: true, force: true });
          }

          // Copy directory contents
          await copyDir(srcDir, destDir);
          console.log(`Restored ${dir} directory successfully`);
        } catch (error) {
          console.error(`Failed to restore ${dir} directory:`, error);
        }
      }
    }

    // Handle favicon files
    const faviconFiles = fsSync
      .readdirSync(path.join(tempDir, "public"))
      .filter((file) => file.startsWith("favicon"));

    for (const file of faviconFiles) {
      const srcPath = path.join(tempDir, "public", file);
      const destPath = path.join(process.cwd(), "public", file);

      try {
        await fs.copyFile(srcPath, destPath);
        console.log(`Restored favicon file: ${file}`);
      } catch (error) {
        console.error(`Failed to restore favicon file ${file}:`, error);
      }
    }
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to clean up temp directory:", error);
    }
  }
}
