import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';

export const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  // Add other models as needed
} as unknown as PrismaClient;

export const resetPrismaMocks = () => {
  Object.values(mockPrismaClient).forEach(model => {
    Object.values(model as Record<string, ReturnType<typeof vi.fn>>).forEach(mock => {
      mock.mockReset();
    });
  });
};
