# Flaky Test Audit Report

## Overview

This document outlines the findings from our comprehensive test suite audit for flaky tests, along with recommendations for fixing identified issues and preventing future flakiness.

## Identified Flaky Test Patterns

### 1. Timing-Dependent Tests

#### Issues Found:
1. **IframeContainer Tests**
   ```typescript
   // Potential flaky test in app/components/iframe/IframeContainer.test.tsx
   it("should update iframe visibility based on active URL", async () => {
     // ... test code ...
     await waitFor(() => {
       // Assertions
     }, { timeout: 2000 });
   });
   ```
   - Uses fixed timeout of 2000ms
   - May fail on slower machines or under load
   - Multiple assertions in single waitFor block

2. **Authentication Redirection Tests**
   ```typescript
   // Potential flaky test in app/lib/auth/auth.test.tsx
   it("redirects authenticated users", async () => {
     // ... test code ...
     await waitFor(() => {
       expect(mockRouterReplace).toHaveBeenCalledWith("/");
     }, { timeout: 2000 });
   });
   ```
   - Fixed timeout for authentication check
   - No retry strategy for network conditions

### 2. Resource Cleanup Issues

1. **File Operation Tests**
   ```typescript
   // Potential issue in app/lib/test/cleanup.test.ts
   describe("File Operation Cleanup Tests", () => {
     const createdFiles = new Set<string>();
     // ... test code ...
   });
   ```
   - Global state between tests
   - Potential for leftover files

2. **Database State**
   ```typescript
   // Potential issue in app/api/admin/url-groups/route.test.ts
   beforeEach(() => {
     vi.clearAllMocks();
     // Missing database state reset
   });
   ```
   - Incomplete cleanup between tests
   - Potential state leakage

### 3. Race Conditions

1. **Concurrent Updates**
   ```typescript
   // Potential race condition in app/api/admin/statistics/boundary.test.ts
   it("should handle data changes between multiple queries", async () => {
     let userCount = 10;
     mockPrisma.user.aggregate.mockImplementation(() => {
       userCount += 1;
       // Shared state modification
     });
   });
   ```
   - Shared state between mock implementations
   - Non-atomic operations

2. **Event Handling**
   ```typescript
   // Potential race in IframeContainer.test.tsx
   it("should cleanup iframes on unmount", async () => {
     unmount();
     await act(async () => {
       await new Promise((resolve) => setTimeout(resolve, 100));
     });
   });
   ```
   - Arbitrary timeout for cleanup
   - Event queue not properly drained

### 4. Network-Dependent Tests

1. **Health Check Tests**
   ```typescript
   // Potential flaky test in app/api/health/route.test.ts
   it("handles multiple system check failures", async () => {
     const mockQueryRaw = vi.fn().mockRejectedValueOnce(new Error("Database connection failed"));
     // No timeout handling for network operations
   });
   ```
   - Network timeouts not properly handled
   - Missing retry logic

## Recommendations

### 1. Timing Dependencies

1. **Replace Fixed Timeouts**
   ```typescript
   // BAD
   await waitFor(() => {}, { timeout: 2000 });

   // GOOD
   await waitFor(
     () => {},
     { 
       timeout: 5000,
       interval: 100,
       onTimeout: (error) => {
         console.error('Timeout Error:', error);
         throw new Error('Component failed to render in time');
       }
     }
   );
   ```

2. **Implement Retry Logic**
   ```typescript
   const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
     let lastError;
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await operation();
       } catch (error) {
         lastError = error;
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
       }
     }
     throw lastError;
   };
   ```

### 2. Resource Cleanup

1. **Implement Comprehensive Cleanup**
   ```typescript
   describe("Test Suite", () => {
     const resources = new Set();

     beforeEach(() => {
       vi.clearAllMocks();
       resources.clear();
     });

     afterEach(async () => {
       await Promise.all(
         Array.from(resources).map(async (resource) => {
           await cleanup(resource);
         })
       );
     });
   });
   ```

2. **Use Test Lifecycle Hooks**
   ```typescript
   describe("Database Tests", () => {
     beforeAll(async () => {
       await setupTestDatabase();
     });

     afterEach(async () => {
       await clearTestData();
     });

     afterAll(async () => {
       await teardownTestDatabase();
     });
   });
   ```

### 3. Race Conditions

1. **Implement Proper State Management**
   ```typescript
   describe("Concurrent Operations", () => {
     let state;
     
     beforeEach(() => {
       state = { counter: 0 };
     });

     it("handles concurrent updates", async () => {
       const operations = Array.from({ length: 5 }, () =>
         updateState(state)
       );
       await Promise.all(operations);
     });
   });
   ```

2. **Use Proper Event Handling**
   ```typescript
   it("handles events correctly", async () => {
     const eventPromise = new Promise(resolve => {
       element.addEventListener('customEvent', resolve, { once: true });
     });
     
     triggerEvent();
     await eventPromise;
   });
   ```

### 4. Network Operations

1. **Implement Timeout Handling**
   ```typescript
   const fetchWithTimeout = async (url: string, timeout = 5000) => {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), timeout);
     
     try {
       const response = await fetch(url, { signal: controller.signal });
       clearTimeout(timeoutId);
       return response;
     } catch (error) {
       clearTimeout(timeoutId);
       throw error;
     }
   };
   ```

2. **Add Retry Logic for Network Operations**
   ```typescript
   const fetchWithRetry = async (url: string, options = {}) => {
     const maxRetries = 3;
     let lastError;
     
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetchWithTimeout(url, options);
       } catch (error) {
         lastError = error;
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
       }
     }
   };
   ```

## Implementation Plan

1. **Immediate Actions**
   - Update all `waitFor` timeouts to use consistent values
   - Implement proper cleanup in file operation tests
   - Add retry logic to network-dependent tests
   - Fix race conditions in concurrent update tests

2. **Short-term Improvements**
   - Create utility functions for common async operations
   - Implement comprehensive resource tracking
   - Add logging for test timing and retries
   - Update test documentation with best practices

3. **Long-term Solutions**
   - Set up automated flaky test detection
   - Implement test stability metrics
   - Create test environment monitoring
   - Regular test suite performance reviews

## Monitoring and Prevention

1. **Test Stability Metrics**
   - Track test execution times
   - Monitor retry frequencies
   - Record cleanup success rates
   - Identify timing-dependent failures

2. **Automated Detection**
   - Implement test result analysis
   - Track flaky test patterns
   - Monitor resource usage
   - Alert on stability issues

3. **Regular Reviews**
   - Weekly test suite analysis
   - Performance trend monitoring
   - Resource usage tracking
   - Cleanup verification

## Next Steps

1. Begin implementing immediate actions:
   - [ ] Update timeouts in IframeContainer tests
   - [ ] Fix cleanup in file operation tests
   - [ ] Add retry logic to health check tests
   - [ ] Resolve race conditions in statistics tests

2. Set up monitoring:
   - [ ] Implement test stability tracking
   - [ ] Add performance monitoring
   - [ ] Create stability dashboards
   - [ ] Configure alerts for flaky tests 
