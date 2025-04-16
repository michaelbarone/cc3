import { PrismaClient } from '@prisma/client';
import { beforeEach, vi } from 'vitest';
import { DeepMockProxy, mockDeep } from 'vitest-mock-extended';

/**
 * Consolidated Prisma mocks
 * @module test/mocks/services/prisma/prisma.mock
 */

export interface Context {
  prisma: PrismaClient;
}

export interface MockContext {
  prisma: DeepMockProxy<PrismaClient>;
}

export const createMockContext = (): MockContext => ({
  prisma: mockDeep<PrismaClient>()
});

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  vi.clearAllMocks();
});

export class PrismaMock {
  private static instance: DeepMockProxy<PrismaClient>;

  static getInstance(): DeepMockProxy<PrismaClient> {
    if (!PrismaMock.instance) {
      PrismaMock.instance = mockDeep<PrismaClient>();
    }
    return PrismaMock.instance;
  }

  static reset(): void {
    if (PrismaMock.instance) {
      Object.values(PrismaMock.instance).forEach(mock => {
        if (typeof mock === 'function' && 'mockClear' in mock) {
          mock.mockClear();
        }
      });
    }
  }
}

export const setupPrismaMocks = (): void => {
  vi.mock('@/lib/db/prisma', () => ({
    prisma: PrismaMock.getInstance()
  }));
};

export const resetPrismaMocks = (): void => {
  PrismaMock.reset();
};

// Transaction mock helpers
export const mockTransaction = async <T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> => {
  return fn(prismaMock);
};

export const setupTransactionMock = (): void => {
  prismaMock.$transaction.mockImplementation((fn: any) => mockTransaction(fn));
};

// Common mock data creators
export const createMockPrismaResponse = <T>(data: T): Promise<T> => {
  return Promise.resolve(data);
};

export const createMockPrismaError = (message: string): Promise<never> => {
  return Promise.reject(new Error(message));
};
