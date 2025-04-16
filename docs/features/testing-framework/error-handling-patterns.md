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
