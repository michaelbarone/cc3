# Mock Consolidation and Standards

## Overview

This document outlines the consolidation of mock implementations and testing standards across the codebase. The goal is to provide a consistent, maintainable, and type-safe mocking system for all tests.

## Directory Structure

```
test/mocks/
├── factories/              # Mock data factories
│   ├── user.factory.ts    # User data factory
│   └── index.ts           # Factory exports
├── services/              # Service mocks
│   ├── auth/             # Authentication mocks
│   │   ├── auth.mock.ts  # Consolidated auth mocks
│   │   └── index.ts      # Auth exports
│   ├── filesystem/       # Filesystem mocks
│   │   ├── fs.mock.ts    # Consolidated filesystem mocks
│   │   └── index.ts      # Filesystem exports
│   ├── prisma/          # Prisma mocks
│   │   ├── prisma.mock.ts # Consolidated Prisma mocks
│   │   └── index.ts      # Prisma exports
│   └── index.ts         # Root exports
```

## Core Mock Implementations

### Authentication Mocks (`auth.mock.ts`)

- Consolidated authentication service mocks
- Token verification and validation
- User authentication flows
- JWT handling and refresh tokens

```typescript
import { authServiceMock, setupAuthMocks, resetAuthMocks } from '@/test/mocks/services/auth';

beforeAll(() => {
  setupAuthMocks();
});

afterEach(() => {
  resetAuthMocks();
});
```

### Filesystem Mocks (`fs.mock.ts`)

- File and directory operations
- Stream handling
- Path management
- File metadata operations

```typescript
import { fileSystemMock, setupFileSystemMocks } from '@/test/mocks/services/filesystem';

beforeAll(() => {
  setupFileSystemMocks();
});

test('file operations', async () => {
  fileSystemMock.readFile.mockResolvedValueOnce('file content');
});
```

### Prisma Mocks (`prisma.mock.ts`)

- Database operations
- Transaction handling
- Query builders
- Model operations

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
});
```

## Best Practices

1. **Mock Setup and Teardown**
   - Always use provided setup functions
   - Reset mocks after each test
   - Clean up resources properly

2. **Type Safety**
   - Use TypeScript interfaces
   - Maintain proper type definitions
   - Avoid any type assertions

3. **Mock Data Management**
   - Use factory functions
   - Keep test data consistent
   - Isolate test cases

4. **Error Handling**
   - Mock error scenarios
   - Test edge cases
   - Validate error states

5. **Performance**
   - Mock only necessary operations
   - Avoid complex mock implementations
   - Use efficient data structures

## Implementation Guidelines

### Setting Up Mocks

```typescript
import { setupTestMocks } from '@/test/mocks/services/setup';

describe('Feature Tests', () => {
  beforeAll(() => {
    setupTestMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test cases...
});
```

### Creating Mock Data

```typescript
import { createMockUser } from '@/test/mocks/factories';

test('user operations', () => {
  const mockUser = createMockUser({
    isAdmin: true,
    preferences: {
      theme: 'dark'
    }
  });
});
```

### Testing Async Operations

```typescript
test('async operations', async () => {
  prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
  
  await expect(async () => {
    // Test async operation
  }).resolves.toBeDefined();
});
```

## Migration Guide

1. Replace old mock implementations with consolidated versions
2. Update import statements to use new mock locations
3. Add proper setup and teardown in test suites
4. Update any custom mock implementations
5. Verify all tests pass with new mocks

## Contributing

When adding new mocks:

1. Follow the established directory structure
2. Create proper TypeScript interfaces
3. Implement setup and reset functions
4. Add documentation and examples
5. Update relevant test files
6. Add unit tests for mock implementations

## Related Documentation

- [Test Data Management](./test-data-management.md)
- [Error Handling Patterns](./error-handling-patterns.md)
- [Performance Testing Standards](./performance-testing-standards.md) 
