import { File } from "formidable";
import { existsSync } from "fs";
import { unlink, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Create and save a user avatar
 * @param userId - User ID
 * @param file - Uploaded file
 * @returns Object with avatarUrl
 */
export async function createAvatar(userId: string, file: File): Promise<{ avatarUrl: string }> {
  try {
    if (!file || !file.filepath) {
      throw new Error("Invalid file");
    }

    // Get file extension from mimetype
    const mimeTypeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
    };

    const ext = mimeTypeToExt[file.mimetype || ""] || "jpg";
    const fileName = `${userId}.${ext}`;
    const avatarPath = join(process.cwd(), "public", "avatars", fileName);

    // Read file content
    const fileContent = await readFileContent(file);

    // Write to destination
    await writeFile(avatarPath, fileContent);

    // Return path relative to public directory for browser access
    const avatarUrl = `/avatars/${fileName}`;

    return { avatarUrl };
  } catch (error) {
    console.error("Error creating avatar:", error);
    throw error;
  }
}

/**
 * Delete a user's avatar
 * @param userId - User ID
 */
export async function deleteAvatar(userId: string): Promise<void> {
  try {
    // Check each possible extension
    const extensions = ["jpg", "png", "gif"];

    for (const ext of extensions) {
      const fileName = `${userId}.${ext}`;
      const avatarPath = join(process.cwd(), "public", "avatars", fileName);

      if (existsSync(avatarPath)) {
        await unlink(avatarPath);
        break; // File found and deleted, stop checking
      }
    }
  } catch (error) {
    console.error("Error deleting avatar:", error);
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
