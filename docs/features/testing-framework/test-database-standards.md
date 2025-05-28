# Test Database Standards

## Overview

This document outlines best practices for using the dedicated test database with the Control Center application. It covers database setup, data management, and test isolation strategies.

## Test Database Architecture

### 1. Separate Test Database

The testing framework uses a separate SQLite database for tests, completely isolated from the development database:

```
┌───────────────────┐     ┌───────────────────┐
│  Application Code │     │    Test Suite     │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│  Prisma Client    │     │  Test DB Client   │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│     Dev/Prod      │     │  Test SQLite DB   │
│     Database      │     │  (.test-db dir)   │
└───────────────────┘     └───────────────────┘
```

### 2. Environment Configuration

The test database uses environment variables to control its behavior:

```typescript
// Default configuration
const TEST_DB_PATH = process.env.TEST_DATABASE_PATH || 
  path.join(process.cwd(), '.test-db', 'test-database.sqlite');
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

// Test type marker used in vitest.setup.ts
process.env.TEST_TYPE = 'integration'; // Set when running integration tests
```

### 3. Client Initialization

The test database client is initialized separately from the main application client:

```typescript
// testPrisma instance with test database URL
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
  log: ['error'],
});
```

## Test Database Lifecycle

### 1. Initialization

Test database initialization happens in these phases:

```typescript
// Initialize database structure
export const initializeTestDatabase = async (): Promise<void> => {
  // Create database directory
  await fs.mkdir(dbDir, { recursive: true });
  
  // Apply Prisma migrations
  execSync(`npx prisma migrate deploy`, {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
  });
};
```

### 2. Data Reset

Data can be reset between tests while maintaining the database structure:

```typescript
export const resetTestDatabase = async (): Promise<void> => {
  // Delete all data in reverse order of dependencies
  await testPrisma.$transaction([
    testPrisma.userSetting.deleteMany(),
    testPrisma.urlsInGroups.deleteMany(),
    testPrisma.userUrlGroup.deleteMany(),
    testPrisma.url.deleteMany(),
    testPrisma.urlGroup.deleteMany(),
    testPrisma.user.deleteMany(),
    testPrisma.appConfig.deleteMany(),
  ]);
};
```

### 3. Seeding

Minimal test data can be seeded for test scenarios:

```typescript
export const seedTestDatabase = async (): Promise<void> => {
  // Create app config
  await testPrisma.appConfig.upsert({
    where: { id: 'app-config' },
    update: {},
    create: {
      appName: 'Test Control Center',
      loginTheme: 'dark',
      registrationEnabled: true,
    },
  });
  
  // Create test admin user
  await testPrisma.user.upsert({
    where: { username: 'test-admin' },
    update: { isAdmin: true },
    create: {
      username: 'test-admin',
      passwordHash: 'test-password-hash',
      isAdmin: true,
    },
  });
};
```

### 4. Teardown

Database connections are properly closed after tests:

```typescript
export const teardownTestDatabase = async (): Promise<void> => {
  await testPrisma.$disconnect();
};
```

## Test Data Management

### 1. Test Isolation

Each test should have isolation through one of these methods:

#### a. Reset Between Tests

```typescript
// In beforeEach hook
beforeEach(async () => {
  // Reset specific tables
  await testPrisma.user.deleteMany();
  
  // Re-seed minimal data
  await testPrisma.user.create({
    data: {
      username: 'test-admin',
      passwordHash: 'test-password-hash',
      isAdmin: true,
    },
  });
});
```

#### b. Transaction Isolation

```typescript
// Using withTestTransaction helper
it('should create a user with settings', async () => {
  await withTestTransaction(async (tx) => {
    // All operations in this callback use the transaction
    // and will be rolled back after the test
    const user = await tx.user.create({
      data: {
        username: 'test-user',
        passwordHash: 'password-hash',
      },
    });
    
    // Test assertions...
  });
});
```

### 2. Data Factory Pattern

Create test entities using factory functions:

```typescript
// User factory
const createTestUser = async (
  client = testPrisma,
  overrides?: Partial<User>
): Promise<User> => {
  return client.user.create({
    data: {
      username: `test-user-${Date.now()}`,
      passwordHash: 'test-password-hash',
      isAdmin: false,
      ...overrides,
    },
  });
};

// URL group factory
const createTestUrlGroup = async (
  client = testPrisma,
  overrides?: Partial<UrlGroup>
): Promise<UrlGroup> => {
  return client.urlGroup.create({
    data: {
      name: `Test Group ${Date.now()}`,
      description: 'Test description',
      ...overrides,
    },
  });
};
```

### 3. Relationship Setup

Create related entities with proper references:

```typescript
// Create user with settings
const createUserWithSettings = async (
  client = testPrisma,
  settings: { key: string; value: string }[],
  userOverrides?: Partial<User>
): Promise<User> => {
  return client.user.create({
    data: {
      username: `test-user-${Date.now()}`,
      passwordHash: 'test-password-hash',
      isAdmin: false,
      ...userOverrides,
      settings: {
        create: settings,
      },
    },
    include: {
      settings: true,
    },
  });
};

// Create URL with group
const createUrlInGroup = async (
  client = testPrisma,
  groupId: string,
  urlOverrides?: Partial<Url>
): Promise<Url> => {
  return client.url.create({
    data: {
      title: `Test URL ${Date.now()}`,
      url: 'https://example.com',
      ...urlOverrides,
      urlGroups: {
        create: [{
          groupId,
          displayOrder: 0,
        }],
      },
    },
    include: {
      urlGroups: true,
    },
  });
};
```

## Integration Tests

### 1. Test Setup Structure

Integration tests should follow this structure:

```typescript
describe('Feature Integration Tests', () => {
  // Initialize database once for the suite
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  // Reset relevant data between tests
  beforeEach(async () => {
    await resetTestTables();
  });
  
  // Close database connection after all tests
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  // Individual tests...
  it('should perform operation', async () => {
    // Test implementation
  });
});
```

### 2. Performance Monitoring

Always monitor test performance:

```typescript
dbTest('should create a user', async (db) => {
  const testTimer = measureTestTime('create user test');
  try {
    // Test implementation
    // ...
  } finally {
    testTimer.end();
  }
});
```

### 3. Error Handling

Properly handle errors in tests:

```typescript
it('should handle errors', async () => {
  const testTimer = measureTestTime('error handling test');
  try {
    await withTestTransaction(async (tx) => {
      // Test implementation
      // ...
    });
  } catch (error) {
    console.error('Test failed:', {
      error,
      performanceMetrics: {
        elapsed: testTimer.elapsed(),
        threshold: THRESHOLDS.INTEGRATION,
      },
    });
    throw error;
  } finally {
    testTimer.end();
  }
});
```

## Test Database Commands

The following npm scripts are available for test database management:

| Command | Description |
|---------|-------------|
| `npm run test:integration` | Run integration tests with test database |
| `npm run test:integration:watch` | Watch mode for integration tests |
| `npm run test:integration:ui` | Run integration tests with UI |
| `npm run test:db:clear` | Clear test database completely |

## Test File Organization

Integration tests using the test database should follow these naming conventions:

- `*.integration.test.ts` - For API integration tests
- `*.db.test.ts` - For database-specific tests

Example directory structure:

```
test/
├── integration/
│   ├── user.integration.test.ts
│   ├── url-group.integration.test.ts
│   └── app-config.integration.test.ts
├── setup/
│   └── test-database.ts
└── mocks/
    └── services/
        └── prisma/
            └── test-db-client.ts
```

## Best Practices

1. **Test Isolation**
   - Always reset relevant data between tests
   - Use transactions for complex operations
   - Avoid dependencies between tests
   - Clean up created resources

2. **Performance Optimization**
   - Initialize database only once per suite
   - Reset only necessary tables between tests
   - Use transactions for test isolation
   - Monitor database operation timing

3. **Error Handling**
   - Capture detailed error context
   - Clean up resources in finally blocks
   - Log detailed database errors
   - Monitor performance during failures

4. **Data Management**
   - Use factory functions for test data
   - Implement proper relationship setup
   - Document test data dependencies
   - Use realistic test data

## Next Steps

1. Implement database factories for all entity types
2. Add database snapshots for faster test setup
3. Add test data generators with Faker.js
4. Implement database state verification utilities 
