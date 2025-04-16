import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearTestFiles,
    createTestFile,
    getCreatedFiles,
    initializeTestFiles,
    mockUnlink,
    resetFileMocks
} from './fs-cleanup';

describe('File System Cleanup Tests', () => {
  beforeEach(() => {
    resetFileMocks();
  });

  afterEach(async () => {
    await clearTestFiles();
  });

  describe('File Creation and Cleanup', () => {
    it('should track created files', async () => {
      const testFiles = [
        { path: 'test1.txt', content: 'test content 1' },
        { path: 'test2.txt', content: 'test content 2' }
      ];

      await initializeTestFiles(testFiles);

      const createdFiles = getCreatedFiles();
      expect(createdFiles).toHaveLength(2);
      expect(createdFiles).toContain(path.resolve('test1.txt'));
      expect(createdFiles).toContain(path.resolve('test2.txt'));
    });

    it('should clear tracked files', async () => {
      const testFiles = [
        { path: 'test1.txt', content: 'test content' }
      ];

      await initializeTestFiles(testFiles);
      await clearTestFiles();

      const remainingFiles = getCreatedFiles();
      expect(remainingFiles).toHaveLength(0);
      expect(mockUnlink).toHaveBeenCalledWith(path.resolve('test1.txt'));
    });
  });

  describe('Test File Creation', () => {
    it('should create a test file with default parameters', () => {
      const file = createTestFile('test.txt');

      expect(file.name).toBe('test.txt');
      expect(file.type).toBe('text/plain');
      expect(file.size).toBe(1024);
    });

    it('should create a test file with custom parameters', () => {
      const file = createTestFile('test.jpg', 'image/jpeg', 2048);

      expect(file.name).toBe('test.jpg');
      expect(file.type).toBe('image/jpeg');
      expect(file.size).toBe(2048);
    });
  });
});
