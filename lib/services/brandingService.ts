import { File } from "formidable";
import { existsSync } from "fs";
import { unlink, writeFile } from "fs/promises";
import { join } from "path";

/**
 * File types allowed for logo uploads
 */
const LOGO_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
};

/**
 * File types allowed for favicon uploads
 */
const FAVICON_MIME_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/**
 * Create and save a logo image
 * @param file - Uploaded file
 * @returns Object with logoPath
 */
export async function createLogo(file: File): Promise<{ logoPath: string }> {
  try {
    if (!file || !file.filepath) {
      throw new Error("Invalid file");
    }

    // Get file extension from mimetype
    const ext = LOGO_MIME_TYPES[file.mimetype || ""];
    if (!ext) {
      throw new Error(
        `Invalid file type. Allowed types: ${Object.keys(LOGO_MIME_TYPES).join(", ")}`,
      );
    }

    const fileName = `logo.${ext}`;
    const filePath = join(process.cwd(), "public", "branding", fileName);

    // Read file content
    const fileContent = await readFileContent(file);

    // Write to destination
    await writeFile(filePath, fileContent);

    // Return path relative to public directory for browser access
    const logoPath = `/branding/${fileName}`;

    return { logoPath };
  } catch (error) {
    console.error("Error creating logo:", error);
    throw error;
  }
}

/**
 * Create and save a favicon image
 * @param file - Uploaded file
 * @returns Object with faviconPath
 */
export async function createFavicon(file: File): Promise<{ faviconPath: string }> {
  try {
    if (!file || !file.filepath) {
      throw new Error("Invalid file");
    }

    // Get file extension from mimetype
    const ext = FAVICON_MIME_TYPES[file.mimetype || ""];
    if (!ext) {
      throw new Error(
        `Invalid file type. Allowed types: ${Object.keys(FAVICON_MIME_TYPES).join(", ")}`,
      );
    }

    const fileName = `favicon.${ext}`;
    // For favicon, we'll save to both the branding directory and public root for better compatibility
    const brandingPath = join(process.cwd(), "public", "branding", fileName);
    const rootPath = join(process.cwd(), "public", fileName);

    // Read file content
    const fileContent = await readFileContent(file);

    // Write to branding directory
    await writeFile(brandingPath, fileContent);

    // Write to root for direct browser access
    await writeFile(rootPath, fileContent);

    // Return path relative to public directory for browser access
    const faviconPath = `/branding/${fileName}`;

    return { faviconPath };
  } catch (error) {
    console.error("Error creating favicon:", error);
    throw error;
  }
}

/**
 * Delete a logo file
 */
export async function deleteLogo(): Promise<void> {
  try {
    // Check each possible extension
    const extensions = Object.values(LOGO_MIME_TYPES);

    for (const ext of extensions) {
      const fileName = `logo.${ext}`;
      const filePath = join(process.cwd(), "public", "branding", fileName);

      if (existsSync(filePath)) {
        await unlink(filePath);
        break; // File found and deleted, stop checking
      }
    }
  } catch (error) {
    console.error("Error deleting logo:", error);
    throw error;
  }
}

/**
 * Delete a favicon file
 */
export async function deleteFavicon(): Promise<void> {
  try {
    // Check each possible extension
    const extensions = Object.values(FAVICON_MIME_TYPES);

    for (const ext of extensions) {
      const fileName = `favicon.${ext}`;

      // Delete from branding directory
      const brandingPath = join(process.cwd(), "public", "branding", fileName);
      if (existsSync(brandingPath)) {
        await unlink(brandingPath);
      }

      // Delete from root directory
      const rootPath = join(process.cwd(), "public", fileName);
      if (existsSync(rootPath)) {
        await unlink(rootPath);
      }
    }
  } catch (error) {
    console.error("Error deleting favicon:", error);
    throw error;
  }
}

/**
 * Helper function to read file content from formidable File
 */
async function readFileContent(file: File): Promise<Buffer> {
  try {
    // Convert the file to a buffer
    const fs = await import("fs/promises");
    return await fs.readFile(file.filepath);
  } catch (error) {
    console.error("Error reading file content:", error);
    throw error;
  }
}
