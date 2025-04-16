import type { PathLike } from "fs";
import type { FileHandle } from "fs/promises";
import path from "path";
import { URL } from 'url';
import { vi, type Mock } from 'vitest';

/**
 * Set to track files created during tests for cleanup verification
 * @internal
 */
const createdFiles = new Set<string>();

/**
 * Mock implementations of fs/promises functions for testing
 * Tracks file creation and deletion for verification
 */
export const mockFsPromises = {
  /**
   * Mock writeFile implementation that tracks created files
   */
  writeFile: vi.fn().mockImplementation(async (file: PathLike | FileHandle, data: unknown) => {
    if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
      createdFiles.add(file.toString());
    }
    return Promise.resolve();
  }) as Mock,

  /**
   * Mock unlink implementation that tracks deleted files
   */
  unlink: vi.fn().mockImplementation(async (file: PathLike) => {
    if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
      createdFiles.delete(file.toString());
    }
    return Promise.resolve();
  }) as Mock,

  mkdir: vi.fn().mockResolvedValue(undefined) as Mock,
  access: vi.fn().mockResolvedValue(undefined) as Mock,
};

/**
 * Initialize test files for file system tests
 * Creates mock files in the public directory for avatars, icons, and logos
 */
export const initializeTestFiles = vi.fn().mockImplementation(() => {
  const oldAvatarPath = path.join(process.cwd(), "public/avatars/old-avatar.webp");
  const oldIconPath = path.join(process.cwd(), "public/icons/old-icon.webp");
  const oldLogoPath = path.join(process.cwd(), "public/logos/old-logo.webp");

  createdFiles.add(oldAvatarPath);
  createdFiles.add(oldIconPath);
  createdFiles.add(oldLogoPath);
}) as Mock;

/**
 * Clear all tracked test files
 * Use this in afterEach blocks to clean up after tests
 */
export const clearTestFiles = vi.fn().mockImplementation(() => {
  createdFiles.clear();
}) as Mock;

/**
 * Get the set of currently tracked files
 * Useful for verifying file operations in tests
 * @returns Set of file paths that have been created
 */
export const getCreatedFiles = vi.fn().mockImplementation(() => {
  return new Set(Array.from(createdFiles));
}) as Mock;

/**
 * Mock implementation of the sharp image processing library
 * Supports basic image operations and tracks created files
 *
 * @param buffer - Input image buffer
 * @throws Error when MOCK_SHARP_FAIL environment variable is set to "true"
 */
export const mockSharp = vi.fn().mockImplementation((buffer: Buffer) => {
  if (process.env.MOCK_SHARP_FAIL === "true") {
    throw new Error("Processing failed");
  }
  return {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockImplementation(async (filepath: string) => {
      await mockFsPromises.writeFile(filepath, Buffer.from("test"));
      return Promise.resolve();
    }),
  };
}) as Mock;

/**
 * Reset all mock implementations to their initial state
 * Use this in beforeEach blocks to ensure a clean state for each test
 */
export const resetMocks = () => {
  vi.clearAllMocks();
  clearTestFiles();
};
