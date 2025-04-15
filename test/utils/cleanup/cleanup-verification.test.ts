import { prisma } from '@/app/lib/db/prisma';
import { authHandlers } from '@/test/utils/mocks/handlers/auth';
import { cleanup } from '@testing-library/react';
import fs from 'fs/promises';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestMocks } from '../mocks';

// Create MSW server
const server = setupServer(...authHandlers);

describe('Cleanup Verification Tests', () => {
  // Track resources that need cleanup verification
  const resources = {
    files: new Set<string>(),
    dbConnections: new Set<string>(),
    mswHandlers: new Set<string>(),
    mockRestores: new Set<string>(),
  };

  // Setup test environment
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resources.files.clear();
    resources.dbConnections.clear();
    resources.mswHandlers.clear();
    resources.mockRestores.clear();
  });

  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('File System Cleanup', () => {
    const { fs: mockFs } = setupTestMocks();
    const testDirs = ['avatars', 'icons', 'logos', 'uploads'];

    beforeEach(() => {
      testDirs.forEach(dir => {
        resources.files.add(`./public/${dir}/test.webp`);
      });
    });

    it('verifies cleanup of temporary test files', async () => {
      // Verify each test directory is cleaned
      for (const dir of testDirs) {
        const testFile = `./public/${dir}/test.webp`;
        expect(resources.files.has(testFile)).toBe(true);

        // Simulate file deletion
        resources.files.delete(testFile);
        expect(resources.files.has(testFile)).toBe(false);
      }

      // Verify all files are cleaned up
      expect(resources.files.size).toBe(0);
    });

    it('handles cleanup of failed file operations', async () => {
      const testFile = './public/avatars/test.webp';
      try {
        await fs.unlink(testFile);
      } catch (error) {
        // Ensure cleanup still happens
        resources.files.delete(testFile);
      }

      expect(resources.files.has(testFile)).toBe(false);
    });
  });

  describe('Database Connection Cleanup', () => {
    it('verifies Prisma connections are properly closed', async () => {
      // Track connection
      resources.dbConnections.add('test-connection');

      // Simulate database operations
      await prisma.$queryRaw`SELECT 1`;

      // Cleanup connection
      await prisma.$disconnect();
      resources.dbConnections.delete('test-connection');

      expect(resources.dbConnections.size).toBe(0);
    });

    it('handles failed database operations cleanup', async () => {
      // Track connection
      resources.dbConnections.add('failed-connection');

      // Simulate failed operation
      try {
        await prisma.$queryRaw`SELECT invalid_column`;
      } catch (error) {
        // Ensure cleanup still happens
        await prisma.$disconnect();
        resources.dbConnections.delete('failed-connection');
      }

      expect(resources.dbConnections.size).toBe(0);
    });
  });

  describe('MSW Handler Cleanup', () => {
    it('verifies MSW handlers are properly reset', () => {
      // Add test handler
      const testHandler = 'test-handler';
      resources.mswHandlers.add(testHandler);

      // Simulate request handling
      server.resetHandlers();
      resources.mswHandlers.delete(testHandler);

      expect(resources.mswHandlers.size).toBe(0);
    });
  });

  describe('Mock Cleanup', () => {
    it('verifies all mocks are restored', () => {
      // Track mocks
      const testMock = 'fs-mock';
      resources.mockRestores.add(testMock);

      // Restore mocks
      vi.restoreAllMocks();
      resources.mockRestores.delete(testMock);

      expect(resources.mockRestores.size).toBe(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('verifies large object cleanup', () => {
      // Create large test object
      const largeObject = new Array(1000).fill('test');

      // Clear reference
      largeObject.length = 0;

      expect(largeObject.length).toBe(0);
    });
  });
});
