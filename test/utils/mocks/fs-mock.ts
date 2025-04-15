import type { Stats } from 'fs';
import { promises as fs } from 'fs';
import { vi, type Mock } from 'vitest';

// Create mock functions
const writeFileMock = vi.fn() as Mock<typeof fs.writeFile>;
const readFileMock = vi.fn() as Mock<typeof fs.readFile>;
const unlinkMock = vi.fn() as Mock<typeof fs.unlink>;
const mkdirMock = vi.fn() as Mock<typeof fs.mkdir>;
const accessMock = vi.fn() as Mock<typeof fs.access>;
const statMock = vi.fn() as Mock<typeof fs.stat>;

export const mockFs = {
  writeFile: writeFileMock,
  readFile: readFileMock,
  unlink: unlinkMock,
  mkdir: mkdirMock,
  access: accessMock,
  stat: statMock,
} as unknown as typeof fs;

export const resetFsMocks = () => {
  Object.values(mockFs).forEach(mock => {
    if (typeof mock === 'function') {
      (mock as ReturnType<typeof vi.fn>).mockReset();
    }
  });
};

export const setupFsMocks = () => {
  vi.mock('fs/promises', () => mockFs);

  // Default implementations
  accessMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
  unlinkMock.mockResolvedValue(undefined);
  mkdirMock.mockResolvedValue(undefined);
  statMock.mockResolvedValue({
    isFile: () => true,
    size: 1024,
    mtime: new Date(),
  } as Stats);
};
