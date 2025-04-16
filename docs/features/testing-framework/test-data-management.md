# Test Data Management

## Overview

This document outlines best practices for managing test data across different types of tests in the Control Center application. It covers data generation, storage, and cleanup strategies.

## Fixtures vs Prisma Mocks

### When to Use Fixtures
- **API Tests**: Use fixtures when testing API endpoints
  - Fixtures represent the actual API response shape
  - Include transformed data (e.g., ISO string dates)
  - Provide better type safety and documentation
  - Example:
    ```typescript
    // Good: Using fixtures for API test
    test("GET /api/users", async () => {
      const mockUser = createMockUser();
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      
      const response = await GET("/api/users");
      const data = await response.json();
      
      expect(data).toEqual([mockUser]); // Fixture includes API transformations
    });
    ```

### When to Use Prisma Mocks
- **Service Layer Tests**: Use prisma mocks when testing database operations
  - Direct database operation testing
  - Transaction testing
  - Raw database schema validation
  - Example:
    ```typescript
    // Good: Using prisma mocks for service test
    test("createUser service", async () => {
      const rawUserData = {
        id: "1",
        name: "Test",
        createdAt: new Date() // Raw date object
      };
      prismaMock.user.create.mockResolvedValue(rawUserData);
      
      const result = await userService.createUser(rawUserData);
      expect(result).toEqual(rawUserData);
    });
    ```

### Best Practices
1. Keep transformations in fixtures
2. Use prisma mocks for database-specific features
3. Maintain clear separation between API and service tests
4. Document transformation logic in fixture factories

## Test Data Categories

### 1. Mock Data

```typescript
// Mock data types
interface MockData {
  users: User[];
  posts: Post[];
  comments: Comment[];
}

// Mock data factory
const createMockData = (): MockData => ({
  users: [
    {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      isAdmin: false
    }
  ],
  posts: [
    {
      id: "post-1",
      title: "Test Post",
      content: "Test content",
      authorId: "user-1"
    }
  ],
  comments: [
    {
      id: "comment-1",
      content: "Test comment",
      postId: "post-1",
      authorId: "user-1"
    }
  ]
});
```

### 2. Fixtures

```typescript
// Fixture types
interface TestFixtures {
  readonly mockData: MockData;
  readonly mockUser: User;
  readonly mockPost: Post;
  cleanup: () => Promise<void>;
}

// Fixture setup
const setupFixtures = async (): Promise<TestFixtures> => {
  const mockData = createMockData();
  
  // Create test data in database
  const mockUser = await prisma.user.create({
    data: mockData.users[0]
  });
  
  const mockPost = await prisma.post.create({
    data: {
      ...mockData.posts[0],
      authorId: mockUser.id
    }
  });
  
  const cleanup = async () => {
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  };
  
  return {
    mockData,
    mockUser,
    mockPost,
    cleanup
  };
};
```

### 3. Factory Functions

```typescript
// User factory
const createUser = (overrides?: Partial<User>): User => ({
  id: `user-${Date.now()}`,
  name: "Test User",
  email: "test@example.com",
  isAdmin: false,
  ...overrides
});

// Post factory with relationships
const createPost = (
  author: User,
  overrides?: Partial<Post>
): Post => ({
  id: `post-${Date.now()}`,
  title: "Test Post",
  content: "Test content",
  authorId: author.id,
  ...overrides
});

// Comment factory with relationships
const createComment = (
  author: User,
  post: Post,
  overrides?: Partial<Comment>
): Comment => ({
  id: `comment-${Date.now()}`,
  content: "Test comment",
  authorId: author.id,
  postId: post.id,
  ...overrides
});
```

## Data Management Strategies

### 1. Database Seeding

```typescript
// Seed data interface
interface SeedData {
  users: User[];
  posts: Post[];
  comments: Comment[];
}

// Seed database
const seedDatabase = async (data: SeedData) => {
  await prisma.$transaction([
    prisma.user.createMany({ data: data.users }),
    prisma.post.createMany({ data: data.posts }),
    prisma.comment.createMany({ data: data.comments })
  ]);
};

// Clear database
const clearDatabase = async () => {
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.post.deleteMany(),
    prisma.user.deleteMany()
  ]);
};

// Usage in tests
beforeAll(async () => {
  await clearDatabase();
  await seedDatabase(createMockData());
});

afterAll(async () => {
  await clearDatabase();
});
```

### 2. Test Isolation

```typescript
// Transaction wrapper for test isolation
const withTestTransaction = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  const result = await prisma.$transaction(async (tx) => {
    const result = await callback();
    return result;
  });
  return result;
};

// Usage in tests
it("creates a post", () => {
  return withTestTransaction(async () => {
    const user = await prisma.user.create({
      data: createUser()
    });
    const post = await prisma.post.create({
      data: createPost(user)
    });
    expect(post).toBeDefined();
  });
});
```

### 3. File Fixtures

```typescript
// File fixture management
const fileFixtures = {
  basePath: path.join(__dirname, "../fixtures/files"),
  
  async setup() {
    await fs.mkdir(this.basePath, { recursive: true });
  },
  
  async cleanup() {
    await fs.rm(this.basePath, { recursive: true, force: true });
  },
  
  async createFile(name: string, content: string) {
    const filePath = path.join(this.basePath, name);
    await fs.writeFile(filePath, content);
    return filePath;
  },
  
  async createImage(name: string) {
    // Create test image using canvas or copy from assets
    const imagePath = path.join(this.basePath, name);
    // Image creation logic here
    return imagePath;
  }
};
```

## Test Data Organization

### 1. Directory Structure

```
tests/
├── fixtures/
│   ├── users.json
│   ├── posts.json
│   └── files/
│       ├── images/
│       └── documents/
├── factories/
│   ├── user.factory.ts
│   ├── post.factory.ts
│   └── comment.factory.ts
└── helpers/
    ├── setup.ts
    └── cleanup.ts
```

### 2. Data Loading

```typescript
// Load JSON fixtures
const loadFixture = async <T>(name: string): Promise<T> => {
  const filePath = path.join(__dirname, "../fixtures", `${name}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
};

// Usage
const users = await loadFixture<User[]>("users");
```

## Best Practices

### 1. Data Generation

```typescript
// Use faker for realistic data
import { faker } from "@faker-js/faker";

const createRealisticUser = (
  overrides?: Partial<User>
): User => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  isAdmin: faker.datatype.boolean(),
  ...overrides
});

// Use meaningful data for specific tests
const createAdminUser = (
  overrides?: Partial<User>
): User => ({
  ...createRealisticUser(),
  isAdmin: true,
  ...overrides
});
```

### 2. Data Cleanup

```typescript
// Cleanup helper
const cleanupTestData = async (
  fixtures: TestFixtures
) => {
  try {
    await fixtures.cleanup();
  } catch (error) {
    console.error("Cleanup failed:", error);
    throw error;
  }
};

// Usage in tests
let fixtures: TestFixtures;

beforeEach(async () => {
  fixtures = await setupFixtures();
});

afterEach(async () => {
  await cleanupTestData(fixtures);
});
```

### 3. Data Validation

```typescript
// Validate test data
const validateTestData = (data: unknown): data is MockData => {
  if (!data || typeof data !== "object") return false;
  
  const mockData = data as MockData;
  return (
    Array.isArray(mockData.users) &&
    Array.isArray(mockData.posts) &&
    Array.isArray(mockData.comments)
  );
};

// Usage
const data = await loadFixture("test-data");
if (!validateTestData(data)) {
  throw new Error("Invalid test data");
}
```

## Performance Optimization

### 1. Shared Setup

```typescript
// Global setup for all tests
const globalSetup = async () => {
  const baseData = createMockData();
  await seedDatabase(baseData);
  return baseData;
};

// Use in test suites
let baseData: MockData;

beforeAll(async () => {
  baseData = await globalSetup();
});

// Individual test setup
beforeEach(async () => {
  await prisma.$transaction(async (tx) => {
    // Create specific test data
  });
});
```

### 2. Lazy Loading

```typescript
// Lazy load large fixtures
const lazyLoadFixture = <T>(name: string) => {
  let data: T | null = null;
  
  return async (): Promise<T> => {
    if (!data) {
      data = await loadFixture<T>(name);
    }
    return data;
  };
};

// Usage
const getLargeDataset = lazyLoadFixture<LargeDataset>("large-dataset");
```

## Integration with CI/CD

### 1. Environment-specific Data

```typescript
// Environment configuration
const getTestConfig = () => ({
  isCI: process.env.CI === "true",
  databaseUrl: process.env.TEST_DATABASE_URL,
  useTestContainer: process.env.USE_TEST_CONTAINER === "true"
});

// Database setup based on environment
const setupTestDatabase = async () => {
  const config = getTestConfig();
  
  if (config.useTestContainer) {
    // Setup test container
    return setupTestContainer();
  }
  
  // Use existing database
  return setupExistingDatabase(config.databaseUrl);
};
```

### 2. Data Snapshots

```typescript
// Create database snapshot
const createSnapshot = async () => {
  const timestamp = Date.now();
  const snapshotPath = path.join(
    __dirname,
    "../snapshots",
    `snapshot-${timestamp}.json`
  );
  
  const data = await prisma.$transaction([
    prisma.user.findMany(),
    prisma.post.findMany(),
    prisma.comment.findMany()
  ]);
  
  await fs.writeFile(
    snapshotPath,
    JSON.stringify(data, null, 2)
  );
  
  return snapshotPath;
};

// Restore from snapshot
const restoreSnapshot = async (
  snapshotPath: string
) => {
  const data = JSON.parse(
    await fs.readFile(snapshotPath, "utf-8")
  );
  await seedDatabase(data);
};
```

## Next Steps

1. Implement automated data generation for new test cases
2. Create data validation schemas for all test fixtures
3. Add performance monitoring for data operations
4. Document data dependencies between test suites 
