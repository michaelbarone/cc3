# Statistics Endpoint Testing Guidelines

## Overview

This document outlines comprehensive testing guidelines for the statistics endpoints in our application. These guidelines ensure consistent, thorough testing of both the detailed statistics (`/api/admin/statistics`) and basic statistics (`/api/admin/stats`) endpoints.

## Endpoints Under Test

1. **Detailed Statistics** (`/api/admin/statistics`)
   - Comprehensive system statistics
   - User preferences and activity data
   - URL group analytics
   
2. **Basic Statistics** (`/api/admin/stats`)
   - Essential system counts
   - Quick dashboard metrics

## Test Categories

### 1. Authentication and Authorization

```typescript
describe("Authentication and Authorization", () => {
  it("should return 401 when not authenticated");
  it("should return 403 when authenticated as non-admin");
  it("should return 200 when authenticated as admin");
});
```

Key Points:
- Always verify authentication before data access
- Test both missing and invalid tokens
- Verify admin-only access restrictions

### 2. Data Validation

```typescript
describe("Data Validation", () => {
  it("should validate all required fields are present");
  it("should ensure numeric values are within valid ranges");
  it("should verify data type consistency");
  it("should validate timestamp formats");
});
```

Key Points:
- Verify all response fields match the StatisticsResponse type
- Ensure numeric values are properly typed (number vs BigInt)
- Validate date formats in activity logs

### 3. Edge Cases

```typescript
describe("Edge Cases", () => {
  it("should handle empty system state");
  it("should handle maximum values");
  it("should manage concurrent updates");
  it("should process large datasets efficiently");
});
```

Key Points:
- Test system with no data
- Handle maximum safe integer values
- Verify behavior with unbalanced distributions
- Test performance with large datasets

## Test Data Generation

### Using Mock Helpers

```typescript
import { createMockUserData, createMockUrlData, statisticsTestScenarios } from "@/test/fixtures/statistics";
import { validateApiResponse } from "@/test/utils/validation/type-validation";

// Example: Testing empty system
const emptySystem = statisticsTestScenarios.emptySystem;
mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: emptySystem.userData.total } });

// Example: Testing high load
const highLoad = statisticsTestScenarios.highLoad;
const userData = createMockUserData({
  total: highLoad.userData.total,
  activeRatio: 0.8,
  adminRatio: 0.1
});
```

### Common Test Scenarios

1. **Empty System**
   - No users
   - No URL groups
   - No URLs

2. **Maximum Values**
   - Maximum safe integer counts
   - BigInt handling
   - Large dataset processing

3. **Unbalanced Distribution**
   - High admin ratio
   - Low active user ratio
   - Skewed theme preferences

4. **Performance Testing**
   - Large result sets
   - Concurrent updates
   - Response time monitoring

## Best Practices

1. **Mock Setup**
   - Use `setupTestMocks()` for consistent test environment
   - Clear mocks before each test
   - Mock all required Prisma calls

2. **Type Safety**
   - Use TypeScript types for response validation
   - Verify BigInt to number conversions
   - Check null handling in optional fields

3. **Error Handling**
   - Test database errors
   - Verify error response format
   - Check error status codes

4. **Performance Considerations**
   - Set timeout thresholds
   - Monitor memory usage
   - Verify pagination limits

## Common Pitfalls

1. **Incomplete Mocking**
   ```typescript
   // BAD: Missing essential mocks
   describe("Statistics Test", () => {
     it("will fail", async () => {
       mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: 100 } });
       // Missing other required mocks!
     });
   });

   // GOOD: Complete mocking
   describe("Statistics Test", () => {
     it("will succeed", async () => {
       mockPrisma.user.aggregate.mockResolvedValue({ _count: { _all: 100 } });
       mockPrisma.user.groupBy.mockImplementation(/* ... */);
       mockPrisma.user.count.mockResolvedValue(50);
       // All required mocks in place
     });
   });
   ```

2. **BigInt Handling**
   ```typescript
   // BAD: Not handling BigInt conversion
   expect(data.system.urls.total).toBe(BigInt(100));

   // GOOD: Converting to number for consistency
   expect(typeof data.system.urls.total).toBe("number");
   expect(data.system.urls.total).toBe(100);
   ```

3. **Missing Edge Cases**
   ```typescript
   // BAD: Only testing happy path
   it("gets statistics", async () => {
     const response = await getStatistics();
     expect(response.status).toBe(200);
   });

   // GOOD: Testing edge cases
   describe("statistics", () => {
     it("handles normal case");
     it("handles empty system");
     it("handles maximum values");
     it("handles concurrent updates");
   });
   ```

## Testing Utilities

### Response Validation

```typescript
import { validateApiResponse } from "@/test/utils/validation/type-validation";

it("should validate response structure", async () => {
  const response = await getStatistics();
  const data = await response.json();
  
  expect(validateApiResponse(data, "StatisticsResponse")).toBe(true);
});
```

### Performance Testing

```typescript
it("should respond within time limit", async () => {
  const startTime = performance.now();
  const response = await getStatistics();
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(1000); // 1 second limit
  expect(response.status).toBe(200);
});
```

## Maintenance and Updates

1. **Regular Review**
   - Update test scenarios as features change
   - Review performance thresholds
   - Update mock data patterns

2. **Documentation**
   - Keep test patterns documented
   - Update guidelines with new edge cases
   - Document known limitations

3. **Coverage**
   - Maintain high test coverage
   - Focus on critical paths
   - Regular coverage audits 
