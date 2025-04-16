# Test Mocks

This directory contains all the mock implementations used in testing.

## Directory Structure

```
test/mocks/
├── factories/              # Mock data factories
│   ├── user.factory.ts    # User data factory
│   └── index.ts          # Factory exports
├── services/              # Service mocks
│   ├── auth/             # Authentication mocks
│   │   ├── auth.mock.ts  # Consolidated auth mocks
│   │   └── index.ts     # Auth exports
│   ├── filesystem/       # Filesystem mocks
│   │   ├── fs.mock.ts    # Consolidated filesystem mocks
│   │   └── index.ts     # Filesystem exports
│   ├── prisma/          # Prisma mocks
│   │   ├── prisma.mock.ts # Consolidated Prisma mocks
│   │   └── index.ts     # Prisma exports
│   ├── next.ts          # Next.js specific mocks
│   ├── server.ts        # Server mocks
│   ├── setup.ts         # Setup utilities
│   └── index.ts         # Service exports
└── index.ts             # Root exports

```

## Usage

### Authentication Mocks

```typescript
import { authServiceMock, setupAuthMocks, resetAuthMocks } from '@/test/mocks/services/auth';

// Setup mocks before tests
beforeAll(() => {
  setupAuthMocks();
});

// Reset mocks after each test
afterEach(() => {
  resetAuthMocks();
});

test('auth functionality', async () => {
  authServiceMock.verifyToken.mockResolvedValueOnce({
    sub: 'test-user',
    email: 'test@example.com'
  });
  // ... test implementation
});
```

### Filesystem Mocks

The filesystem mock provides a comprehensive mock implementation for both synchronous and asynchronous file operations, with proper ES module support.

```typescript
import { fileSystemMock, setupFileSystemMocks } from '@/test/mocks/services/filesystem';

// Setup mocks before all tests
beforeAll(() => {
  setupFileSystemMocks();
});

// Reset mocks after each test
beforeEach(() => {
  fileSystemMock.reset();
});

// Example: Testing synchronous operations (e.g., health checks)
test('filesystem access check', () => {
  // Mock successful access check
  fileSystemMock.accessSync.mockReturnValueOnce(undefined);
  
  // Mock access denied
  fileSystemMock.accessSync.mockImplementationOnce(() => {
    throw new Error('Access denied');
  });
});

// Example: Testing asynchronous operations
test('file read operations', async () => {
  fileSystemMock.readFile.mockResolvedValueOnce('file content');
});
```

#### Mock Implementation Details

The filesystem mock handles both default and named exports from 'fs':

```typescript
// Default import usage (e.g., `import fs from 'fs'`)
fs.accessSync('.', fs.constants.R_OK | fs.constants.W_OK);

// Named import usage (e.g., `import { promises as fs } from 'fs'`)
await fs.readFile('file.txt');
```

Key Features:
- Full ES module support (`__esModule: true`)
- Proper constants (`R_OK`, `W_OK`)
- Synchronous operations (`accessSync`, etc.)
- Asynchronous operations via `promises`
- In-memory file system tracking
- Automatic cleanup between tests

Common Use Cases:

1. Health Checks:
```typescript
// Mock successful filesystem access
fileSystemMock.accessSync.mockReturnValueOnce(undefined);

// Mock filesystem error
fileSystemMock.accessSync.mockImplementationOnce(() => {
  throw new Error('Filesystem error');
});
```

2. File Operations:
```typescript
// Mock successful file read
fileSystemMock.readFile.mockResolvedValueOnce(Buffer.from('content'));

// Mock file write
fileSystemMock.writeFile.mockResolvedValueOnce(undefined);

// Mock file existence check
fileSystemMock.exists.mockResolvedValueOnce(true);
```

3. Directory Operations:
```typescript
// Mock directory listing
fileSystemMock.readdir.mockResolvedValueOnce(['file1.txt', 'file2.txt']);

// Mock directory creation
fileSystemMock.mkdir.mockResolvedValueOnce(undefined);
```

Best Practices:
1. Always use `setupFileSystemMocks()` in `beforeAll`
2. Reset the mock in `beforeEach` to ensure clean state
3. Use `mockReturnValueOnce` for simple cases
4. Use `mockImplementationOnce` for complex scenarios
5. Mock filesystem errors when testing error handling
6. Include proper cleanup in `afterEach` if creating test files

### Prisma Mocks

```typescript
import { prismaMock, setupPrismaMocks } from '@/test/mocks/services/prisma';

beforeAll(() => {
  setupPrismaMocks();
});

test('database operations', async () => {
  prismaMock.user.findUnique.mockResolvedValueOnce({
    id: '1',
    name: 'Test User'
  });
  // ... test implementation
});
```

### Factory Usage

```typescript
import { createMockUser } from '@/test/mocks/factories';

test('user operations', () => {
  const mockUser = createMockUser({
    isAdmin: true
  });
  // ... test implementation
});
```

## Best Practices

1. Always use the setup and reset functions provided by each mock module
2. Reset mocks after each test to ensure clean state
3. Use factory functions to create consistent test data
4. Mock only what's necessary for each test
5. Use TypeScript interfaces for type safety
6. Document complex mock scenarios
7. Keep mock implementations simple and focused

## Contributing

When adding new mocks:

1. Place them in the appropriate directory
2. Create an index.ts file if adding a new directory
3. Export from the main index.ts
4. Add documentation and usage examples
5. Follow the existing patterns and naming conventions
6. Add proper TypeScript types
7. Include setup and reset functions 
