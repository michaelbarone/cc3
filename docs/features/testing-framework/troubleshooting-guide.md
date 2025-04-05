# Test Troubleshooting Guide

## Overview

This guide provides solutions for common test failures and issues encountered in the Control Center testing framework. It includes diagnostic steps, common causes, and recommended solutions.

## Common Test Failures

### 1. Authentication Test Failures

#### Symptoms
```
Error: Expected status 401, received 200
Error: Token validation failed
Error: Session not found
```

#### Common Causes
1. Mock token validation not properly set up
2. Session persistence between tests
3. Incorrect cleanup in `beforeEach`/`afterEach` hooks

#### Solutions
```typescript
// SOLUTION 1: Proper mock setup
beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyToken.mockReset();
  mockGetSession.mockReset();
});

// SOLUTION 2: Clear session data
afterEach(() => {
  vi.mocked(getSession).mockResolvedValue(null);
  localStorage.clear();
  sessionStorage.clear();
});

// SOLUTION 3: Proper token validation mock
vi.mocked(verifyToken).mockImplementation(async (token) => {
  if (!token) throw new Error("No token provided");
  if (token === "invalid") throw new Error("Invalid token");
  return { id: "user-id", isAdmin: false };
});
```

### 2. Database Connection Issues

#### Symptoms
```
Error: PrismaClientInitializationError
Error: Connection refused
Error: Database timeout
```

#### Common Causes
1. Test database not running
2. Incorrect database URL in test environment
3. Transaction conflicts

#### Solutions
```typescript
// SOLUTION 1: Proper database initialization
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// SOLUTION 2: Transaction isolation
beforeEach(async () => {
  await prisma.$transaction([
    prisma.user.deleteMany(),
    prisma.post.deleteMany()
  ]);
});

// SOLUTION 3: Mock database for unit tests
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
} as unknown as PrismaClient;
```

### 3. Component Rendering Issues

#### Symptoms
```
Error: Unable to find element with test-id
Error: Component not rendered
Error: Act warning
```

#### Common Causes
1. Async operations not properly waited for
2. Missing providers in test setup
3. Incorrect component mounting

#### Solutions
```typescript
// SOLUTION 1: Proper async handling
it("renders data after loading", async () => {
  render(<TestComponent />);
  await waitFor(() => {
    expect(screen.getByTestId("data")).toBeInTheDocument();
  });
});

// SOLUTION 2: Complete provider setup
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// SOLUTION 3: Proper component cleanup
afterEach(() => {
  cleanup();
  queryClient.clear();
});
```

### 4. File System Operation Failures

#### Symptoms
```
Error: ENOENT: no such file or directory
Error: EACCES: permission denied
Error: EBUSY: resource busy or locked
```

#### Common Causes
1. Test files not properly cleaned up
2. Incorrect file paths in tests
3. File handle not properly closed

#### Solutions
```typescript
// SOLUTION 1: Proper file cleanup
const testFilePath = path.join(__dirname, "test.txt");

afterEach(async () => {
  try {
    await fs.unlink(testFilePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
});

// SOLUTION 2: Safe file operations
const safeWriteFile = async (
  path: string,
  data: string
): Promise<void> => {
  try {
    await fs.writeFile(path, data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      await fs.unlink(path);
      await fs.writeFile(path, data);
    } else {
      throw error;
    }
  }
};
```

### 5. Network Request Failures

#### Symptoms
```
Error: Network request failed
Error: Timeout exceeded
Error: Failed to fetch
```

#### Common Causes
1. Missing request mocks
2. Incorrect request matching
3. Network timeouts

#### Solutions
```typescript
// SOLUTION 1: Proper request mocking
beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// SOLUTION 2: Request matching with MSW
rest.get("/api/data", (req, res, ctx) => {
  const query = req.url.searchParams.get("query");
  if (!query) {
    return res(ctx.status(400));
  }
  return res(ctx.json({ data: "test" }));
});

// SOLUTION 3: Timeout handling
const fetchWithTimeout = async (
  url: string,
  timeout = 5000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
```

## Test Performance Issues

### 1. Slow Tests

#### Symptoms
- Tests taking longer than 5 seconds
- Timeout errors in CI
- Inconsistent test durations

#### Solutions
```typescript
// SOLUTION 1: Parallel test execution
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  }
});

// SOLUTION 2: Mock heavy operations
const mockHeavyOperation = vi.fn().mockResolvedValue("result");

// SOLUTION 3: Reduce setup overhead
const setupTestData = vi.fn().mockResolvedValue({
  user: mockUser,
  posts: mockPosts
});
```

### 2. Memory Leaks

#### Symptoms
- Increasing memory usage
- Out of memory errors
- Slow test execution over time

#### Solutions
```typescript
// SOLUTION 1: Proper cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// SOLUTION 2: Clear subscriptions
const unsubscribe = subscribe();
afterEach(() => {
  unsubscribe();
});

// SOLUTION 3: Clear intervals
const intervals: NodeJS.Timeout[] = [];
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  intervals.forEach(clearInterval);
  intervals.length = 0;
  vi.useRealTimers();
});
```

## Debugging Techniques

### 1. Test Environment Debug Mode

```typescript
// Enable debug mode
process.env.DEBUG = "true";

// Debug logger
const debug = (message: string, ...args: unknown[]) => {
  if (process.env.DEBUG === "true") {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

// Usage in tests
it("debugs authentication flow", async () => {
  debug("Starting auth test");
  const response = await handler();
  debug("Response received", response);
  expect(response.status).toBe(200);
});
```

### 2. Component Testing Debug Tools

```typescript
// Debug component renders
const debugRender = (ui: React.ReactElement) => {
  const container = render(ui);
  debug("Component structure:", container.container.innerHTML);
  return container;
};

// Debug component updates
const debugEffect = (effect: () => void) => {
  debug("Before effect");
  effect();
  debug("After effect");
};
```

### 3. Network Request Debugging

```typescript
// Debug request interceptor
const debugInterceptor = (handler: RequestHandler) => {
  return async (req: Request) => {
    debug("Incoming request:", {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers)
    });
    const response = await handler(req);
    debug("Outgoing response:", {
      status: response.status,
      headers: Object.fromEntries(response.headers)
    });
    return response;
  };
};
```

## Common Pitfalls

### 1. Test Isolation

```typescript
// BAD: Shared state between tests
let user: User;

beforeAll(() => {
  user = createUser();
});

// GOOD: Isolated test state
beforeEach(() => {
  const user = createUser();
});
```

### 2. Async Operations

```typescript
// BAD: Missing await
it("fails to wait", () => {
  render(<AsyncComponent />);
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});

// GOOD: Proper async handling
it("waits for content", async () => {
  render(<AsyncComponent />);
  await waitFor(() => {
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });
});
```

### 3. Mock Reset

```typescript
// BAD: Mocks not reset
const mock = vi.fn();

it("test 1", () => {
  mock.mockReturnValue("test");
});

it("test 2", () => {
  // mock still returns "test"
});

// GOOD: Proper mock reset
beforeEach(() => {
  mock.mockReset();
});
```

## Next Steps

1. Implement automated test failure analysis
2. Add test failure patterns to CI reporting
3. Create test debugging utilities library
4. Document common test patterns for new developers 
