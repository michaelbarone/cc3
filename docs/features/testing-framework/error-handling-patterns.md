# Error Handling Patterns in Testing

## Overview
This document outlines standardized patterns for testing error handling in the Control Center application. These patterns ensure consistent and comprehensive error testing across all components and integrate seamlessly with our debugging standards.

## Test Framework Integration

### Related Testing Standards
- [Vitest and React Testing Library Standards](./vitest-react-testing-lib-testing-standards.md)
  - Unit test error handling
  - Component test error states
  - Mock error scenarios

- [Playwright E2E Standards](./playwright-e2e-standards.md)
  - Browser error handling
  - Network error simulation
  - UI error state testing

- [Prisma Testing Standards](./prisma-testing-standards.md)
  - Database error handling
  - Transaction error testing
  - Constraint violation testing

### Core Testing Guidelines
- [Test Data Management](./test-data-management.md)
  - Error state test data
  - Invalid input scenarios
  - Boundary condition data

- [Test Debugging Standards](./test-debugging-standards.md)
  - Error logging patterns
  - Debug helper functions
  - Error state capture

## Error Categories and Test Patterns

### 1. Authentication Errors
```typescript
describe('Authentication Error Handling', () => {
  it('should handle invalid credentials', async () => {
    const mockAuth = vi.fn().mockRejectedValue(new AuthError('Invalid credentials'));
    
    try {
      await authenticateUser(mockAuth);
    } catch (error) {
      // Log detailed error context
      console.error('Authentication failed:', {
        error,
        timestamp: new Date().toISOString(),
        context: 'Authentication test',
        requestData: { /* mock request data */ }
      });
      
      expect(error).toBeInstanceOf(AuthError);
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('AUTH_001'); // Standardized error codes
    }
  });
});
```

### 2. Authorization Errors
```typescript
describe('Authorization Error Handling', () => {
  it('should handle insufficient permissions', async () => {
    const mockAccess = vi.fn().mockRejectedValue(
      new AccessDeniedError('Insufficient permissions')
    );
    
    try {
      await performAction(mockAccess);
    } catch (error) {
      logTestError('Authorization test failed', {
        error,
        context: 'Permission check',
        userRole: 'user',
        requiredRole: 'admin'
      });
      
      expect(error).toBeInstanceOf(AccessDeniedError);
      expect(error.code).toBe('AUTH_002');
    }
  });
});
```

### 3. Database Errors
```typescript
describe('Database Error Handling', () => {
  it('should handle connection failures', async () => {
    const mockDb = vi.fn().mockRejectedValue(
      new DatabaseError('Connection failed')
    );
    
    try {
      await queryDatabase(mockDb);
    } catch (error) {
      logTestError('Database operation failed', {
        error,
        operation: 'query',
        retryCount: 3,
        lastAttempt: new Date().toISOString()
      });
      
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe('DB_001');
    }
  });
});
```

### 4. File System Errors
```typescript
describe('File System Error Handling', () => {
  it('should handle file not found', async () => {
    const mockFs = vi.fn().mockRejectedValue(
      new FileSystemError('File not found')
    );
    
    await expect(async () => {
      await readFile(mockFs);
    }).rejects.toThrow('File not found');
  });
});
```

### 5. Input Validation Errors
```typescript
describe('Input Validation Error Handling', () => {
  it('should handle invalid input format', () => {
    const invalidInput = { name: '' };
    
    expect(() => {
      validateInput(invalidInput);
    }).toThrow('Name is required');
  });
});
```

## Best Practices

### 1. Mock Setup
```typescript
// Good Practice
const mockService = {
  operation: vi.fn().mockRejectedValue(new CustomError('Error message'))
};

// Bad Practice - Avoid using generic Error
const mockService = {
  operation: vi.fn().mockRejectedValue(new Error('Generic error'))
};
```

### 2. Error Assertion
```typescript
// Good Practice
await expect(async () => {
  await riskyOperation();
}).rejects.toThrow(CustomError);

// Better Practice - Check error properties
await expect(async () => {
  await riskyOperation();
}).rejects.toMatchObject({
  name: 'CustomError',
  message: 'Expected error message',
  code: 'ERROR_CODE'
});
```

### 3. Error Recovery
```typescript
describe('Error Recovery', () => {
  it('should retry failed operations', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new NetworkError('Temporary failure'))
      .mockResolvedValueOnce('Success');
    
    const result = await retryOperation(mockOperation);
    expect(result).toBe('Success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});
```

## Common Error Scenarios

### 1. Concurrent Operations
```typescript
describe('Concurrent Operations', () => {
  it('should handle race conditions', async () => {
    const operations = [
      performOperation(),
      performOperation(),
      performOperation()
    ];
    
    await expect(async () => {
      await Promise.all(operations);
    }).rejects.toThrow(ConcurrencyError);
  });
});
```

### 2. Resource Cleanup
```typescript
describe('Resource Cleanup', () => {
  it('should release resources on error', async () => {
    const cleanup = vi.fn();
    
    try {
      await useResource();
    } catch (error) {
      cleanup();
    }
    
    expect(cleanup).toHaveBeenCalled();
  });
});
```

## Integration with Test Debugging

### 1. Debug Helpers Integration
```typescript
import { debugElement, debugResponse, measureTestTime } from '../helpers/debug';

describe('UI Error States', () => {
  it('should handle and debug UI errors', async ({ page }) => {
    const testTimer = measureTestTime('UI Error Test');
    
    try {
      const errorButton = await debugElement(page, '[data-testid="error-trigger"]');
      await errorButton.click();
      
      const response = await page.waitForResponse(url => url.includes('/api/error'));
      await debugResponse(response);
      
    } catch (error) {
      await page.screenshot({
        path: `test-results/ui-error-${Date.now()}.png`,
        fullPage: true
      });
      
      logTestError('UI interaction failed', {
        error,
        url: page.url(),
        elementState: await debugElement(page, '[data-testid="error-trigger"]'),
        testDuration: testTimer.elapsed()
      });
      
      throw error;
    } finally {
      testTimer.end();
    }
  });
});
```

### 2. Network Error Monitoring
```typescript
describe('API Error Handling', () => {
  it('should capture network errors', async ({ page }) => {
    const testTimer = measureTestTime('API Error Test');
    
    // Monitor network requests
    page.on('request', request => {
      console.log('Request:', {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', async response => {
      if (response.status() >= 400) {
        console.error('API Error:', {
          url: response.url(),
          status: response.status(),
          body: await response.text().catch(() => 'Unable to get body'),
          timestamp: new Date().toISOString(),
          testDuration: testTimer.elapsed()
        });
      }
    });
    
    try {
      // Test implementation
      await page.goto('/api-test');
      await debugElement(page, '[data-testid="api-trigger"]');
      
    } finally {
      testTimer.end();
    }
  });
});
```

## Test Performance Monitoring

### 1. Test Timing Integration
```typescript
describe('Performance Error Handling', () => {
  it('should handle timeout errors', async () => {
    const testTimer = measureTestTime('Timeout Test');
    
    try {
      await expect(async () => {
        await longRunningOperation();
      }).rejects.toThrow(TimeoutError);
      
    } finally {
      const duration = testTimer.end();
      if (duration > 5000) {
        console.warn('Test exceeded recommended duration:', {
          testName: 'Timeout Test',
          duration,
          threshold: 5000
        });
      }
    }
  });
});
```

### 2. Response Time Assertions
```typescript
describe('API Response Time', () => {
  it('should handle slow responses', async () => {
    const testTimer = measureTestTime('API Response Test');
    
    try {
      const response = await fetch('/api/endpoint');
      await debugResponse(response);
      
      const duration = testTimer.elapsed();
      expect(duration).toBeLessThan(1000); // 1 second threshold
      
    } catch (error) {
      logTestError('API response time test failed', {
        error,
        duration: testTimer.elapsed(),
        threshold: 1000
      });
      throw error;
    } finally {
      testTimer.end();
    }
  });
});
```

## Error Handling Best Practices

### 1. Test Organization
```typescript
describe('Feature Tests', () => {
  // Setup error monitoring
  beforeAll(() => {
    setupErrorMonitoring();
  });
  
  // Clear error state before each test
  beforeEach(() => {
    clearErrorState();
  });
  
  // Log any uncaught errors
  afterEach(() => {
    logUncaughtErrors();
  });
  
  // Test implementation
  it('should handle errors properly', async () => {
    const testTimer = measureTestTime();
    try {
      // Test code
    } catch (error) {
      logTestError('Test failed', { error, duration: testTimer.elapsed() });
      throw error;
    } finally {
      testTimer.end();
    }
  });
});
```

### 2. Error State Management
```typescript
interface ErrorState {
  error: Error;
  context: string;
  timestamp: string;
  testName: string;
  duration: number;
}

function captureErrorState(error: Error, testTimer: TestTimer): ErrorState {
  return {
    error,
    context: 'test execution',
    timestamp: new Date().toISOString(),
    testName: expect.getState().currentTestName,
    duration: testTimer.elapsed()
  };
}
```

## Related Documentation
- [Test Debugging Standards](./test-debugging-standards.md) - Comprehensive debugging patterns
- [Test Data Management](./test-data-management.md) - Error state test data management
- [API Testing Standards](./api-testing-standards.md) - API error handling patterns
- [Error Code Registry](./error-code-registry.md) - Centralized error code documentation
- [Performance Testing Standards](./performance-testing-standards.md) - Test timing and performance monitoring
- [E2E Testing Standards](./playwright-e2e-standards.md) - Browser and network error handling 

## API Test Error Handling Patterns

Our API test review established consistent error handling patterns that should be used in all API tests.

### Standard Error Handling Pattern

```typescript
it("handles database errors gracefully", async () => {
  const testTimer = measureTestTime("database error test");
  try {
    vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await debugResponse(response);

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Error getting app config" });
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } catch (error) {
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

### Using debugError Utility

The `debugError` utility provides consistent error logging across all tests:

```typescript
// Debug utility implementation
export function debugError(
  error: Error,
  context?: Record<string, any>
): void {
  console.error("Test Error:", {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
}

// Usage in tests
try {
  // Test code that might fail
} catch (error) {
  debugError(error as Error, {
    // Include mock states
    verifyToken: vi.mocked(verifyToken).mock.calls,
    findUnique: vi.mocked(prisma.appConfig.findUnique).mock.calls,
    
    // Include performance metrics
    performanceMetrics: {
      elapsed: testTimer.elapsed(),
      threshold: THRESHOLDS.API,
    },
    
    // Include test-specific context
    testData: mockData,
    requestBody: requestData,
  });
  throw error; // Re-throw to fail the test
}
```

### Error Context Capturing

Capturing error context is crucial for debugging test failures:

```typescript
it("validates login theme", async () => {
  const testTimer = measureTestTime("login theme validation test");
  try {
    vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken);

    const response = await PATCH(
      mockRequest({
        loginTheme: "invalid" as any,
      }),
    );
    const data = await debugResponse(response);

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid theme value" });
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } catch (error) {
    // Capture comprehensive error context
    debugError(error as Error, {
      // Authentication context
      verifyToken: vi.mocked(verifyToken).mock.calls,
      tokenResult: mockAdminToken,
      
      // Request context
      requestBody: { loginTheme: "invalid" },
      
      // Test timing context
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

### Mock State Logging During Errors

Regular mock state logging helps diagnose test failures:

```typescript
// Before/after hooks for mock state logging
beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  // Debug mock states after each test
  debugMockCalls(vi.mocked(verifyToken), "verifyToken");
  debugMockCalls(vi.mocked(prisma.appConfig.findUnique), "appConfig.findUnique");
  debugMockCalls(vi.mocked(prisma.appConfig.upsert), "appConfig.upsert");
});

// The debugMockCalls utility
export function debugMockCalls<T extends (...args: any[]) => any>(
  mockFn: ReturnType<typeof vi.fn<T>>,
  name: string
): void {
  console.log(`Mock State [${name}]:`, {
    callCount: mockFn.mock.calls.length,
    calls: mockFn.mock.calls,
    results: mockFn.mock.results,
  });
}
```

### File System Error Handling

Special handling for file system operations:

```typescript
it("handles file system errors", async () => {
  const testTimer = measureTestTime("file system error test");
  try {
    // Mock file system error
    vi.mocked(fs.writeFile).mockImplementation((path, data, callback) => {
      callback(new Error("Unable to write file"));
    });
    
    const response = await POST(mockFileRequest());
    const data = await debugResponse(response);
    
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Error saving file" });
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } catch (error) {
    debugError(error as Error, {
      // File system context
      fileSystem: {
        writeFileCalls: vi.mocked(fs.writeFile).mock.calls,
        unlinkCalls: vi.mocked(fs.unlink).mock.calls,
      },
      // Performance context
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

### Test Response Debugging

Using `debugResponse` to inspect error responses:

```typescript
// Debug response utility
export async function debugResponse<T = any>(
  response: Response
): Promise<T> {
  const isJsonResponse = response.headers.get("content-type")?.includes("application/json");
  
  try {
    // Clone response to avoid body already read errors
    const clonedResponse = response.clone();
    
    // Get response data based on content type
    const data = isJsonResponse 
      ? await clonedResponse.json() 
      : await clonedResponse.text();
    
    // Log response details
    console.log("Response Debug:", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    });
    
    return data as T;
  } catch (error) {
    console.error("Error reading response:", error);
    return {} as T;
  }
}

// Usage in tests
it("handles authentication errors", async () => {
  vi.mocked(verifyToken).mockResolvedValueOnce(null);
  
  const response = await GET();
  const data = await debugResponse(response);
  
  expect(response.status).toBe(401);
  expect(data).toEqual({ error: "Unauthorized" });
});
```

## API Error Handling Checklist

For each API test, ensure these error handling patterns are implemented:

1. ✅ Wrap test logic in try/catch/finally blocks
2. ✅ Use measureTestTime to track performance
3. ✅ Use debugResponse to inspect error responses
4. ✅ Use debugError to capture error context
5. ✅ Include mock states in error context
6. ✅ Include performance metrics in error context
7. ✅ Use debugMockCalls in afterEach hooks
8. ✅ Verify performance with THRESHOLDS constants
9. ✅ Include test-specific context in error logging
10. ✅ Re-throw errors to fail tests appropriately
