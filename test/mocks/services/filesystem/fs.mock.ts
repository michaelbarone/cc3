import { vi } from 'vitest';

/**
 * Consolidated filesystem mocks
 * @module test/mocks/services/filesystem/fs.mock
 */

export const createdFiles = new Set<string>();

export interface MockFile {
  name: string;
  content: string | Buffer;
  size: number;
  lastModified: Date;
  type: string;
}

export interface MockDirectory {
  path: string;
  files: Map<string, MockFile>;
  directories: Map<string, MockDirectory>;
}

export class FileSystemMock {
  private static instance: FileSystemMock;
  private fileSystem: Map<string, MockFile | MockDirectory> = new Map();

  accessSync = vi.fn().mockImplementation((path: string): void => undefined);

  readFile = vi.fn().mockImplementation((path: string): Promise<string | Buffer> => {
    const file = this.fileSystem.get(path) as MockFile;
    if (!file || file instanceof Map) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve(file.content);
  });

  writeFile = vi.fn().mockImplementation((path: string, content: string | Buffer): Promise<void> => {
    this.fileSystem.set(path, {
      name: path.split('/').pop() || '',
      content,
      size: content.length,
      lastModified: new Date(),
      type: 'file'
    });
    return Promise.resolve();
  });

  exists = vi.fn().mockImplementation((path: string): Promise<boolean> => {
    return Promise.resolve(this.fileSystem.has(path));
  });

  mkdir = vi.fn().mockImplementation((path: string): Promise<void> => {
    this.fileSystem.set(path, {
      path,
      files: new Map(),
      directories: new Map()
    });
    return Promise.resolve();
  });

  readdir = vi.fn().mockImplementation((path: string): Promise<string[]> => {
    const dir = this.fileSystem.get(path) as MockDirectory;
    if (!dir || !(dir.files instanceof Map)) {
      return Promise.reject(new Error('Directory not found'));
    }
    return Promise.resolve([
      ...Array.from(dir.files.keys()),
      ...Array.from(dir.directories.keys())
    ]);
  });

  unlink = vi.fn().mockImplementation((path: string): Promise<void> => {
    if (!this.fileSystem.has(path)) {
      return Promise.reject(new Error('File not found'));
    }
    this.fileSystem.delete(path);
    return Promise.resolve();
  });

  rmdir = vi.fn().mockImplementation((path: string): Promise<void> => {
    if (!this.fileSystem.has(path)) {
      return Promise.reject(new Error('Directory not found'));
    }
    this.fileSystem.delete(path);
    return Promise.resolve();
  });

  stat = vi.fn().mockImplementation((path: string): Promise<{ size: number; mtime: Date }> => {
    const entry = this.fileSystem.get(path);
    if (!entry) {
      return Promise.reject(new Error('Path not found'));
    }
    if ('content' in entry) {
      return Promise.resolve({
        size: entry.size,
        mtime: entry.lastModified
      });
    }
    return Promise.resolve({
      size: 0,
      mtime: new Date()
    });
  });

  static getInstance(): FileSystemMock {
    if (!FileSystemMock.instance) {
      FileSystemMock.instance = new FileSystemMock();
    }
    return FileSystemMock.instance;
  }

  reset(): void {
    this.fileSystem.clear();
    this.accessSync.mockClear();
    this.readFile.mockClear();
    this.writeFile.mockClear();
    this.exists.mockClear();
    this.mkdir.mockClear();
    this.readdir.mockClear();
    this.unlink.mockClear();
    this.rmdir.mockClear();
    this.stat.mockClear();
  }
}

export const fileSystemMock = FileSystemMock.getInstance();

export const createTestFile = (name: string, content: string | Buffer = ''): MockFile => ({
  name,
  content,
  size: content.length,
  lastModified: new Date(),
  type: 'file'
});

export const setupFileSystemMocks = (): void => {
  vi.mock('fs', () => {
    return {
      __esModule: true,
      default: {
        accessSync: fileSystemMock.accessSync,
        constants: {
          R_OK: 4,
          W_OK: 2
        }
      },
      promises: {
        readFile: fileSystemMock.readFile,
        writeFile: fileSystemMock.writeFile,
        exists: fileSystemMock.exists,
        mkdir: fileSystemMock.mkdir,
        readdir: fileSystemMock.readdir,
        unlink: fileSystemMock.unlink,
        rmdir: fileSystemMock.rmdir,
        stat: fileSystemMock.stat
      }
    };
  });
};

export const resetFileSystemMocks = (): void => {
  fileSystemMock.reset();
};
