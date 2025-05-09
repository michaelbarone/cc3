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

## Factory Function Examples from API Tests

### User Factory Functions

```typescript
// Admin user factory with role specification
const createTestAdmin = (overrides?: Partial<User>): User => ({
  id: `admin-${Date.now()}`,
  name: "Test Admin",
  email: "admin@example.com",
  isAdmin: true,
  createdAt: new Date().toISOString(), // API format
  updatedAt: new Date().toISOString(), // API format
  ...overrides
});

// Regular user factory
const createMockUser = (overrides?: Partial<User>): User => ({
  id: `user-${Date.now()}`,
  name: "Test User",
  email: "user@example.com",
  isAdmin: false,
  createdAt: new Date().toISOString(), // API format
  updatedAt: new Date().toISOString(), // API format
  ...overrides
});

// Example usage in tests
describe("Admin API", () => {
  const mockAdminToken = createTestAdmin();
  const mockNonAdminToken = createMockUser();

  beforeEach(() => {
    vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
  });

  it("allows admin access", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("denies non-admin access", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce(mockNonAdminToken);
    const response = await GET();
    expect(response.status).toBe(403);
  });
});
```

### File Object Factories

```typescript
// File blob factory with proper buffer handling
const createTestFileBlob = (
  content: string = "test file content",
  options: {
    type?: string;
    size?: number;
    filename?: string;
  } = {}
): Blob => {
  const defaultOptions = {
    type: "application/octet-stream",
    size: content.length,
    filename: "test-file.txt",
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Create buffer of specified size if needed
  let fileContent = content;
  if (mergedOptions.size > content.length) {
    fileContent = content.padEnd(mergedOptions.size, "0");
  }
  
  return new Blob([fileContent], { type: mergedOptions.type });
};

// Create a file that exceeds size limits
const createLargeFile = (sizeInMB: number = 6): Blob => {
  const oneMB = 1024 * 1024;
  const size = sizeInMB * oneMB;
  return createTestFileBlob("0", { size });
};

// Example usage in tests
describe("File Upload", () => {
  it("validates file size", async () => {
    const testTimer = measureTestTime("file size validation test");
    try {
      const largeFile = createLargeFile(6); // 6MB file (over limit)
      const formData = new FormData();
      formData.append("file", largeFile, "large-file.txt");
      
      const response = await POST(new Request("http://test", {
        method: "POST",
        body: formData
      }));
      
      expect(response.status).toBe(400);
      expect(await debugResponse(response)).toEqual({ 
        error: "File size exceeds the 5MB limit" 
      });
    } finally {
      testTimer.end();
    }
  });
});
```

### App Configuration Factories

```typescript
// App config factory with theme settings
const createTestAppConfig = (overrides?: Partial<AppConfig>): AppConfig => ({
  id: "app-config",
  appName: "Test App",
  appLogo: null,
  loginTheme: "light", // Defaults to light theme
  registrationEnabled: true,
  favicon: null,
  createdAt: new Date().toISOString(), // API format
  updatedAt: new Date().toISOString(), // API format
  ...overrides
});

// Example usage in tests
describe("App Config API", () => {
  const mockConfig = createTestAppConfig({
    loginTheme: "dark", // Override default theme
    registrationEnabled: false
  });
  
  beforeEach(() => {
    vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockConfig);
  });
  
  it("returns existing config", async () => {
    const response = await GET();
    const data = await debugResponse(response);
    
    expect(response.status).toBe(200);
    expect(data).toEqual(mockConfig);
  });
  
  it("validates theme values", async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
    
    const response = await PATCH(
      mockRequest({
        loginTheme: "invalid" as any,
      }),
    );
    
    expect(response.status).toBe(400);
    expect(await debugResponse(response)).toEqual({ 
      error: "Invalid theme value" 
    });
  });
});
```

### URL and URL Group Factories

```typescript
// URL factory with group assignment
const createTestUrl = (
  urlGroupId?: string,
  overrides?: Partial<URL>
): URL => ({
  id: `url-${Date.now()}`,
  name: "Test URL",
  url: "https://example.com",
  description: "Test description",
  urlGroupId: urlGroupId || null,
  createdAt: new Date().toISOString(), // API format
  updatedAt: new Date().toISOString(), // API format
  ...overrides
});

// URL group factory
const createTestUrlGroup = (overrides?: Partial<URLGroup>): URLGroup => ({
  id: `group-${Date.now()}`,
  name: "Test Group",
  description: "Test group description",
  createdAt: new Date().toISOString(), // API format
  updatedAt: new Date().toISOString(), // API format
  ...overrides
});

// Example usage in tests
describe("URL Management API", () => {
  const mockUrlGroup = createTestUrlGroup();
  const mockUrl = createTestUrl(mockUrlGroup.id);
  
  beforeEach(() => {
    vi.mocked(prisma.uRLGroup.findUnique).mockResolvedValue(mockUrlGroup);
    vi.mocked(prisma.uRL.findMany).mockResolvedValue([mockUrl]);
  });
  
  it("returns URLs for a group", async () => {
    const response = await GET();
    const data = await debugResponse(response);
    
    expect(response.status).toBe(200);
    expect(data).toEqual([mockUrl]);
  });
});
```

## API vs Service Layer Data Pattern

Our improved test suite strictly follows these data patterns:

### API Layer Testing Example

```typescript
// API test using fixtures (app/api/admin/app-config/route.test.ts)
describe("PATCH /api/admin/app-config", () => {
  it("should update app name", async () => {
    const testTimer = measureTestTime("update app name test");
    try {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);
      
      // Use fixture with API format dates (ISO strings)
      const updatedConfig = createTestAppConfig({
        appName: "New Control Center",
      });
      
      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(updatedConfig);

      const response = await PATCH(mockRequest({ appName: "New Control Center" }));
      const data = await debugResponse(response) as AppConfig;

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedConfig); // Direct comparison with fixture
      expect(vi.mocked(prisma.appConfig.upsert)).toHaveBeenCalledWith({
        where: { id: "app-config" },
        create: expect.any(Object),
        update: { appName: "New Control Center" },
      });
      expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } finally {
      testTimer.end();
    }
  });
});
```

### Service Layer Testing Example

```typescript
// Service test using raw data objects (not shown in API tests)
describe("appConfigService.updateAppName", () => {
  it("should update app name", async () => {
    const testTimer = measureTestTime("update app name service test");
    try {
      // Use raw date objects for service layer
      const rawAppConfig = {
        id: "app-config",
        appName: "Test App",
        createdAt: new Date(), // Raw Date object
        updatedAt: new Date() // Raw Date object
      };
      
      const updatedConfig = {
        ...rawAppConfig,
        appName: "New App Name",
        updatedAt: new Date() // New Date object
      };
      
      prismaMock.appConfig.update.mockResolvedValue(updatedConfig);

      const result = await appConfigService.updateAppName("New App Name");

      expect(result).toEqual(updatedConfig); // Service returns raw objects
      expect(result.updatedAt).toBeInstanceOf(Date); // Date is a Date object
      expect(prismaMock.appConfig.update).toHaveBeenCalledWith({
        where: { id: "app-config" },
        data: { appName: "New App Name" }
      });
    } finally {
      testTimer.end();
    }
  });
});
```
