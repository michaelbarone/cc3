# API Test Coverage Standards

## Overview

This document outlines the standards and requirements for API test coverage in the Control Center application. Our testing strategy ensures comprehensive coverage of all API endpoints, HTTP methods, and edge cases.

## Coverage Requirements

### Endpoint Coverage

1. **100% Route Coverage**
   - Every API route defined in the `app/api/` directory must have corresponding tests
   - All nested routes and dynamic routes must be tested
   - Tests must be organized to mirror the API route structure

2. **HTTP Method Coverage**
   - Each HTTP method implemented (GET, POST, PUT, DELETE, etc.) must be tested
   - Method handlers must be tested with appropriate request payloads
   - Return values and status codes must be validated

3. **Authentication and Authorization**
   - Unauthenticated access scenarios must be tested
   - Role-based access control must be verified
   - Token validation and expiration must be tested

## Test Organization

API tests are organized to mirror the API route structure:

```
test/
└── integration/
    └── api/
        ├── admin/
        │   ├── app-config/
        │   │   ├── favicon.test.ts
        │   │   ├── logo.test.ts
        │   │   ├── registration.test.ts
        │   │   └── theme.test.ts
        │   ├── backup/
        │   │   └── route.test.ts
        │   ├── statistics/
        │   │   └── route.test.ts
        │   ├── url-groups/
        │   │   └── [...].test.ts
        │   └── users/
        │       └── [...].test.ts
        ├── auth/
        │   ├── login.test.ts
        │   ├── me.test.ts
        │   └── session.test.ts
        ├── url-groups/
        │   └── route.test.ts
        └── user/
            ├── preferences.test.ts
            └── [...].test.ts
```

## Test File Structure

Each API test file follows this consistent structure:

```typescript
// Import test utilities
import { expect, describe, it, beforeEach, afterEach } from "vitest";
import { measureTestTime, THRESHOLDS } from "@/test/helpers/performance";
import { createTestClient } from "@/test/helpers/api-client";
import { mockAuth } from "@/test/mocks/services/auth";

// Type definitions for request/response
interface RequestData {
  // Request payload type
}

interface ResponseData {
  // Expected response type
}

describe("API: /api/path/to/endpoint", () => {
  const apiClient = createTestClient();
  
  // Setup and teardown
  beforeEach(() => {
    // Setup test data and mocks
  });
  
  afterEach(() => {
    // Clean up
  });
  
  // Test normal operation
  it("should handle valid request", async () => {
    const timer = measureTestTime("valid-request");
    try {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "test-user", role: "USER" } });
      const requestData: RequestData = { /* test data */ };
      
      // Act
      const response = await apiClient.post("/api/path", requestData);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        // Expected response shape
      });
      
      // Performance assertion
      expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } finally {
      timer.end();
    }
  });
  
  // Test authentication
  it("should reject unauthenticated request", async () => {
    const timer = measureTestTime("unauthenticated-request");
    try {
      // Arrange
      mockAuth.mockResolvedValue(null);
      
      // Act
      const response = await apiClient.post("/api/path", {});
      
      // Assert
      expect(response.status).toBe(401);
      
      // Performance assertion
      expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } finally {
      timer.end();
    }
  });
  
  // Test error cases
  it("should handle invalid input", async () => {
    const timer = measureTestTime("invalid-input");
    try {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "test-user", role: "USER" } });
      const invalidData = { /* invalid test data */ };
      
      // Act
      const response = await apiClient.post("/api/path", invalidData);
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
      
      // Performance assertion
      expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
    } finally {
      timer.end();
    }
  });
});
```

## Edge Case Coverage

Each API endpoint must be tested against these edge cases:

1. **Input Validation**
   - Empty or missing required fields
   - Invalid field types or formats
   - Boundary values (min/max lengths, values)

2. **Error Handling**
   - Database errors (connection, query)
   - External service failures
   - Timeout handling

3. **Security Scenarios**
   - Cross-site request forgery protection
   - Rate limiting (if applicable)
   - Input sanitization

4. **Performance Conditions**
   - Large payload handling
   - Response time monitoring
   - Resource cleanup

## Performance Standards

All API tests must adhere to performance thresholds:

```typescript
export const THRESHOLDS = {
  API: 2000, // 2 seconds max for API operations
};
```

API tests should use the performance monitoring utilities:

```typescript
const timer = measureTestTime("operation-name");
try {
  // Test code
  expect(timer.elapsed()).toBeLessThan(THRESHOLDS.API);
} finally {
  timer.end();
}
```

## Test Data Management

1. **Factory Functions**
   - Use factory functions for test data creation
   - Implement proper type checking
   - Include sensible defaults
   - Support partial overrides

```typescript
// Example factory function
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: "test-id",
    username: "testuser",
    email: "test@example.com",
    role: "USER",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
```

2. **API vs. Service Layer**
   - API tests should use data formatted for API (ISO strings)
   - Service tests should use native types (Date objects)

## Current Coverage Status

| API Area | Route Coverage | Method Coverage | Edge Case Coverage |
|----------|---------------|----------------|-------------------|
| Auth     | 100%          | 100%           | 100%              |
| User     | 100%          | 100%           | 100%              |
| Admin    | 100%          | 100%           | 100%              |
| URLs     | 100%          | 100%           | 100%              |
| Groups   | 100%          | 100%           | 100%              |
| Settings | 100%          | 100%           | 100%              |

## Continuous Integration

API tests are run on every pull request and must pass before merging:

1. **Coverage Reports**
   - Generated automatically in CI
   - Available in PR comments
   - Must maintain 100% route coverage

2. **Performance Monitoring**
   - Performance trends tracked over time
   - Alerts on performance degradation
   - Test timing reports available in CI artifacts
