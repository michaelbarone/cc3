/**
 * Test cleanup utilities
 * @module test/utils/cleanup
 */

import path from 'path';
import { createdFiles } from '../mocks/filesystem';

/**
 * File tracking utilities for test cleanup
 */

/**
 * Initialize test files in the tracking system
 * Creates default test files for avatars, icons, and logos
 */
export function initializeTestFiles() {
  const oldAvatarPath = path.join(process.cwd(), "public/avatars/old-avatar.webp");
  const oldIconPath = path.join(process.cwd(), "public/icons/old-icon.webp");
  const oldLogoPath = path.join(process.cwd(), "public/logos/old-logo.webp");

  createdFiles.add(oldAvatarPath);
  createdFiles.add(oldIconPath);
  createdFiles.add(oldLogoPath);
}

/**
 * Clear all tracked test files
 */
export function clearTestFiles() {
  createdFiles.clear();
}

/**
 * Get the set of currently tracked files
 * @returns A new Set containing all tracked files
 */
export function getCreatedFiles() {
  return new Set(createdFiles);
}

/**
 * Check if a file exists in the tracking system
 * @param filePath - The path of the file to check
 */
export function fileExists(filePath: string) {
  return createdFiles.has(filePath);
}

/**
 * Add a file to the tracking system
 * @param filePath - The path of the file to add
 */
export function addFile(filePath: string) {
  createdFiles.add(filePath);
}

/**
 * Remove a file from the tracking system
 * @param filePath - The path of the file to remove
 */
export function removeFile(filePath: string) {
  createdFiles.delete(filePath);
}

// Re-export file system cleanup utilities
export * from './file/fs-cleanup';
// More cleanup utilities will be added here as we migrate them
