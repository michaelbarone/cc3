# Performance Testing Standards

## Overview
This document defines standards for monitoring and optimizing test performance across all test types in the Control Center application. These standards ensure tests remain efficient, reliable, and maintainable.

## Test Performance Requirements

### 1. Test Duration Thresholds
```typescript
// Performance thresholds by test type
const THRESHOLDS = {
  UNIT: 100,      // 100ms
  INTEGRATION: 1000, // 1 second
  E2E: 5000,      // 5 seconds
  API: 2000       // 2 seconds
} as const;

describe('Feature Tests', () => {
  it('should complete within threshold', async () => {
    const testTimer = measureTestTime('Feature Test');
    
    try {
      // Test implementation
      await performOperation();
      
      const duration = testTimer.elapsed();
      expect(duration).toBeLessThan(THRESHOLDS.UNIT);
      
    } finally {
      testTimer.end();
    }
  });
});
```

### 2. Response Time Monitoring
```typescript
describe('API Response Times', () => {
  it('should respond within SLA', async () => {
    const testTimer = measureTestTime('API Response');
    
    try {
      const startTime = Date.now();
      const response = await fetch('/api/endpoint');
      const endTime = Date.now();
      
      await debugResponse(response, {
        timing: {
          total: endTime - startTime,
          threshold: THRESHOLDS.API
        }
      });
      
      expect(endTime - startTime).toBeLessThan(THRESHOLDS.API);
      
    } finally {
      testTimer.end();
    }
  });
});
```

## Performance Monitoring Tools

### 1. Test Timer Utility
```typescript
interface TestTimer {
  elapsed(): number;
  end(): number;
  getStartTime(): number;
  getEndTime(): number | null;
}

function measureTestTime(testName?: string): TestTimer {
  const startTime = Date.now();
  let endTime: number | null = null;
  
  return {
    elapsed: () => Date.now() - startTime,
    end: () => {
      endTime = Date.now();
      const duration = endTime - startTime;
      
      if (testName) {
        console.log(`Test Duration [${testName}]:`, {
          duration,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        });
      }
      
      return duration;
    },
    getStartTime: () => startTime,
    getEndTime: () => endTime
  };
}
```

### 2. Response Debug Helper
```typescript
interface DebugResponseOptions {
  timing?: {
    total: number;
    threshold: number;
  };
}

async function debugResponse(
  response: Response,
  options?: DebugResponseOptions
): Promise<void> {
  const debugInfo = {
    url: response.url,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    timing: options?.timing
  };

  if (options?.timing) {
    const { total, threshold } = options.timing;
    if (total > threshold) {
      console.warn('Response exceeded threshold:', {
        ...debugInfo,
        exceeded: total - threshold
      });
    }
  }

  console.log('Response Debug:', debugInfo);
}
```

## Performance Optimization Patterns

### 1. Test Setup Optimization
```typescript
describe('Optimized Tests', () => {
  // Shared setup - runs once for the suite
  beforeAll(async () => {
    const timer = measureTestTime('Suite Setup');
    try {
      await setupTestData();
    } finally {
      timer.end();
    }
  });

  // Individual test setup - should be fast
  beforeEach(() => {
    const timer = measureTestTime('Test Setup');
    try {
      resetTestState();
    } finally {
      timer.end();
    }
  });

  it('should use optimized setup', async () => {
    const timer = measureTestTime('Individual Test');
    try {
      // Test implementation
    } finally {
      timer.end();
    }
  });
});
```

### 2. Mock Optimization
```typescript
describe('Mock Performance', () => {
  // Efficient mock setup
  const createOptimizedMock = () => {
    const mock = {
      data: new Map(),
      get: vi.fn(),
      set: vi.fn()
    };

    // Setup mock implementations once
    mock.get.mockImplementation((key) => mock.data.get(key));
    mock.set.mockImplementation((key, value) => mock.data.set(key, value));

    return mock;
  };

  it('should use efficient mocks', async () => {
    const timer = measureTestTime('Mock Test');
    const mock = createOptimizedMock();

    try {
      await performOperation(mock);
      expect(mock.get).toHaveBeenCalled();
    } finally {
      timer.end();
    }
  });
});
```

## Performance Monitoring Integration

### 1. CI Integration
```typescript
describe('CI Performance Checks', () => {
  const CI_THRESHOLD_MULTIPLIER = 1.5; // Allow 50% more time in CI

  it('should handle CI environment', async () => {
    const timer = measureTestTime('CI Test');
    
    try {
      await performOperation();
      
      const threshold = process.env.CI 
        ? THRESHOLDS.UNIT * CI_THRESHOLD_MULTIPLIER 
        : THRESHOLDS.UNIT;
      
      expect(timer.elapsed()).toBeLessThan(threshold);
    } finally {
      timer.end();
    }
  });
});
```

### 2. Performance Reporting
```typescript
interface PerformanceReport {
  testName: string;
  duration: number;
  threshold: number;
  exceededThreshold: boolean;
  timestamp: string;
}

class PerformanceReporter {
  private reports: PerformanceReport[] = [];

  addReport(testName: string, duration: number, threshold: number): void {
    this.reports.push({
      testName,
      duration,
      threshold,
      exceededThreshold: duration > threshold,
      timestamp: new Date().toISOString()
    });
  }

  generateReport(): void {
    console.table(this.reports);
    
    const violations = this.reports.filter(r => r.exceededThreshold);
    if (violations.length > 0) {
      console.warn('Performance violations detected:', violations);
    }
  }
}
```

## Best Practices

### 1. Test Organization
- Group related tests to share setup
- Use appropriate beforeAll/beforeEach
- Clean up resources promptly
- Monitor setup/teardown times

### 2. Resource Management
- Close connections after tests
- Clear large test data
- Release system resources
- Monitor memory usage

### 3. Performance Debugging
- Use performance timing helpers
- Monitor test duration trends
- Investigate slow tests promptly
- Document performance fixes

## Related Documentation
- [Test Debugging Standards](./test-debugging-standards.md) - Debug helper integration
- [Test Data Management](./test-data-management.md) - Efficient test data handling
- [Error Handling Patterns](./error-handling-patterns.md) - Performance-related error handling
- [E2E Testing Standards](./playwright-e2e-standards.md) - Browser performance testing
- [API Testing Standards](./api-testing-standards.md) - API performance monitoring 

## Performance Monitoring in API Tests

Our API test review has established a standardized approach for monitoring performance in all API tests. This approach should be followed in all new and updated tests.

### Tiered Timing Approach

```typescript
describe("API Test Suite", () => {
  // Suite-level timer - tracks entire test suite duration
  const suiteTimer = measureTestTime("API Test Suite");
  
  beforeEach(() => {
    // Setup timers if needed
  });
  
  afterEach(() => {
    // Log performance metrics if needed
  });
  
  afterAll(() => {
    // End suite timer and log results
    suiteTimer.end();
  });
  
  it("performs operation within threshold", async () => {
    // Test-level timer - tracks individual test case
    const testTimer = measureTestTime("individual test");
    
    try {
      // Setup test data
      
      // Operation-level timer - tracks specific operation
      const operationTimer = measureTestTime("specific operation");
      try {
        await performOperation();
      } finally {
        operationTimer.end();
      }
      
      // Verify operation completed within threshold
      expect(operationTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      
      // Assert test results
    } finally {
      // Always end timer in finally block
      testTimer.end();
    }
  });
});
```

### Real-World Example: App Config API

From our improved `app/api/admin/app-config/route.test.ts` file:

```typescript
describe("App Configuration API", () => {
  // Suite-level timer
  const suiteTimer = measureTestTime("App Config API Suite");
  
  // Test data setup
  const mockAdminToken = createTestAdmin();
  const mockNonAdminToken = createMockUser();
  const mockConfig = createTestAppConfig({
    // Config properties...
  });
  
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  afterEach(() => {
    // Debug mock states for performance analysis
    debugMockCalls(vi.mocked(verifyToken), "verifyToken");
    debugMockCalls(vi.mocked(prisma.appConfig.findUnique), "appConfig.findUnique");
    // Additional mock debugging...
  });
  
  afterAll(() => {
    // End and log suite timer
    suiteTimer.end();
  });
  
  describe("GET /api/admin/app-config", () => {
    it("should return existing app configuration", async () => {
      // Test-level timer
      const testTimer = measureTestTime("get existing config test");
      
      try {
        // Setup mocks
        vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockConfig);
        
        // Perform operation (implicit operation timing)
        const response = await GET();
        const data = await debugResponse(response);
        
        // Assertions
        expect(response.status).toBe(200);
        expect(data).toEqual(mockConfig);
        
        // Verify test completed within threshold
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
      } finally {
        testTimer.end();
      }
    });
    
    // More test cases...
  });
  
  // More describe blocks...
});
```

### Integration with Error Handling

Performance monitoring is integrated with error handling:

```typescript
it("handles database errors gracefully", async () => {
  const testTimer = measureTestTime("database error test");
  
  try {
    // Mock database error
    vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(new Error("Database error"));
    
    // Perform operation
    const response = await GET();
    const data = await debugResponse(response);
    
    // Assertions
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Error getting app config" });
    
    // Verify test completed within threshold despite error
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } catch (error) {
    // Include performance metrics in error context
    debugError(error as Error, {
      findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
      performanceMetrics: {
        elapsed: testTimer.elapsed(),
        threshold: THRESHOLDS.API,
      },
    });
    throw error;
  } finally {
    testTimer.end();
  }
});
```

### Performance Monitoring Patterns

#### 1. Suite Timer

Used to track an entire test suite's performance:

```typescript
describe("Feature Test Suite", () => {
  const suiteTimer = measureTestTime("Feature Suite");
  
  // Test cases...
  
  afterAll(() => {
    suiteTimer.end();
  });
});
```

#### 2. Test Timer

Used for individual test cases:

```typescript
it("performs specific function", async () => {
  const testTimer = measureTestTime("specific function test");
  
  try {
    // Test implementation
  } finally {
    testTimer.end();
  }
});
```

#### 3. Operation Timer

Used for specific operations within a test:

```typescript
it("uploads and processes file", async () => {
  const testTimer = measureTestTime("file upload test");
  
  try {
    // Setup test data
    
    // Measure upload operation
    const uploadTimer = measureTestTime("file upload operation");
    try {
      await uploadFile(testFile);
    } finally {
      uploadTimer.end();
    }
    expect(uploadTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    
    // Measure processing operation
    const processTimer = measureTestTime("file processing operation");
    try {
      await processFile(fileId);
    } finally {
      processTimer.end();
    }
    expect(processTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
    
    // Test assertions
  } finally {
    testTimer.end();
  }
});
```

### Using Performance Thresholds

All API tests use standard threshold constants to ensure consistent performance requirements:

```typescript
// Performance thresholds by test type
export const THRESHOLDS = {
  UNIT: 100,      // 100ms
  INTEGRATION: 1000, // 1 second
  E2E: 5000,      // 5 seconds
  API: 2000       // 2 seconds
} as const;

// Usage in tests
expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
```

### Best Practices

1. ✅ Use suite-level timers for all test suites
2. ✅ Use test-level timers for all test cases
3. ✅ Use operation-level timers for complex operations
4. ✅ Always end timers in finally blocks
5. ✅ Verify elapsed time against standard thresholds
6. ✅ Include performance metrics in error context
7. ✅ Use descriptive timer names for better logs
8. ✅ Add performance assertions before other assertions
9. ✅ Debug mock calls for performance bottlenecks
10. ✅ Log response latency with debugResponse utility

### Performance Reporting Conventions

```typescript
// Standard duration logging format
console.log(`Test Duration [${testName}]:`, {
  duration: endTime - startTime,
  startTime: new Date(startTime).toISOString(),
  endTime: new Date(endTime).toISOString(),
  threshold: THRESHOLDS.API,
  underThreshold: (endTime - startTime) < THRESHOLDS.API
});
```
