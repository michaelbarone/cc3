import type { PathLike } from 'fs'
import type { FileHandle } from 'fs/promises'
import { vi } from 'vitest'

/**
 * Track created files for cleanup verification
 */
export const createdFiles = new Set<string>()

/**
 * Create mock filesystem operations
 */
export const createMockFileSystem = () => {
  const fs = {
    writeFile: vi.fn(async (file: PathLike | FileHandle, data: any) => {
      if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
        createdFiles.add(file.toString())
      }
      return Promise.resolve()
    }),

    unlink: vi.fn(async (file: PathLike) => {
      if (typeof file === "string" || Buffer.isBuffer(file) || file instanceof URL) {
        createdFiles.delete(file.toString())
      }
      return Promise.resolve()
    }),

    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
  }

  return fs
}

/**
 * Create mock sharp image processing
 */
export const createMockSharp = () => {
  const mockFs = createMockFileSystem()

  return vi.fn((buffer) => {
    if (process.env.MOCK_SHARP_FAIL === "true") {
      throw new Error("Processing failed")
    }
    return {
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockImplementation(async (filepath) => {
        // Simulate file creation
        await mockFs.writeFile(filepath, Buffer.from("test"))
        return Promise.resolve()
      }),
    }
  })
}

// Mock the fs/promises module
vi.mock("fs/promises", () => ({
  default: createMockFileSystem(),
  createdFiles,
}))

// Mock the sharp module
vi.mock("sharp", () => ({
  default: createMockSharp(),
}))
