# Error Handling Patterns in Tests

## Overview

This document outlines standardized patterns for testing error handling across different types of operations in the Control Center application. These patterns ensure consistent and comprehensive error coverage in our test suites.

## Core Error Categories

### 1. Authentication Errors

```typescript
describe("Authentication Errors", () => {
  it("handles missing token", async () => {
    const response = await handler();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized"
    });
  });

  it("handles invalid token", async () => {
    vi.mocked(verifyToken).mockRejectedValue(
      new Error("Invalid token")
    );
    const response = await handler();
    expect(response.status).toBe(401);
  });

  it("handles expired token", async () => {
    vi.mocked(verifyToken).mockRejectedValue(
      new Error("Token expired")
    );
    const response = await handler();
    expect(response.status).toBe(401);
  });
});
```

### 2. Authorization Errors

```typescript
describe("Authorization Errors", () => {
  it("handles non-admin access to admin routes", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      id: "user-id",
      isAdmin: false
    });
    const response = await handler();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Admin privileges required"
    });
  });

  it("handles resource access without permission", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      id: "user-id",
      isAdmin: false
    });
    const response = await handler();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Insufficient permissions"
    });
  });
});
```

### 3. Database Errors

```typescript
describe("Database Errors", () => {
  it("handles connection errors", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error("Connection refused")
    );
    const response = await handler();
    expect(response.status).toBe(500);
  });

  it("handles constraint violations", async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(
      new Error("Unique constraint violation")
    );
    const response = await handler();
    expect(response.status).toBe(400);
  });

  it("handles transaction failures", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("Transaction failed")
    );
    const response = await handler();
    expect(response.status).toBe(500);
  });
});
```

### 4. File System Errors

```typescript
describe("File System Errors", () => {
  it("handles file not found", async () => {
    const error = Object.assign(new Error("File not found"), {
      code: "ENOENT"
    });
    vi.mocked(fs.access).mockRejectedValue(error);
    const response = await handler();
    expect(response.status).toBe(404);
  });

  it("handles permission denied", async () => {
    const error = Object.assign(new Error("Permission denied"), {
      code: "EACCES"
    });
    vi.mocked(fs.writeFile).mockRejectedValue(error);
    const response = await handler();
    expect(response.status).toBe(500);
  });

  it("handles disk full", async () => {
    const error = Object.assign(new Error("No space left"), {
      code: "ENOSPC"
    });
    vi.mocked(fs.writeFile).mockRejectedValue(error);
    const response = await handler();
    expect(response.status).toBe(500);
  });
});
```

### 5. Input Validation Errors

```typescript
describe("Input Validation Errors", () => {
  it("handles missing required fields", async () => {
    const response = await handler({
      ...validData,
      requiredField: undefined
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Required field missing"
    });
  });

  it("handles invalid data types", async () => {
    const response = await handler({
      ...validData,
      numericField: "not-a-number"
    });
    expect(response.status).toBe(400);
  });

  it("handles out-of-range values", async () => {
    const response = await handler({
      ...validData,
      age: -1
    });
    expect(response.status).toBe(400);
  });
});
```

## Error Handling Best Practices

### 1. Mock Setup

```typescript
// GOOD: Comprehensive mock setup
beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockFs.access.mockResolvedValue(undefined);
  mockVerifyToken.mockResolvedValue(null);
});

// BAD: Incomplete mock setup
beforeEach(() => {
  vi.clearAllMocks();
  // Missing mock implementations
});
```

### 2. Error Assertion

```typescript
// GOOD: Comprehensive error checking
it("handles database error", async () => {
  const dbError = new Error("Database error");
  mockPrisma.user.findUnique.mockRejectedValue(dbError);

  const response = await handler();
  const data = await response.json();

  expect(response.status).toBe(500);
  expect(data).toEqual({
    error: "Internal server error"
  });
  expect(console.error).toHaveBeenCalledWith(
    "Database error:",
    dbError
  );
});

// BAD: Insufficient error checking
it("handles error", async () => {
  mockPrisma.user.findUnique.mockRejectedValue(new Error());
  const response = await handler();
  expect(response.status).toBe(500);
});
```

### 3. Error Recovery

```typescript
// GOOD: Testing error recovery
it("recovers from temporary database error", async () => {
  // First call fails
  mockPrisma.user.findUnique
    .mockRejectedValueOnce(new Error("Temporary error"))
    // Second call succeeds
    .mockResolvedValueOnce(mockUser);

  const response = await handler();
  expect(response.status).toBe(200);
  expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
});
```

## Common Error Scenarios

### 1. Concurrent Operations

```typescript
describe("Concurrent Operations", () => {
  it("handles concurrent updates", async () => {
    // Simulate concurrent update
    mockPrisma.user.update
      .mockRejectedValueOnce(new Error("Update conflict"))
      .mockResolvedValueOnce(mockUser);

    const response = await handler();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Resource conflict"
    });
  });
});
```

### 2. Resource Limits

```typescript
describe("Resource Limits", () => {
  it("handles file size limits", async () => {
    const largeFile = new File(
      ["x".repeat(1024 * 1024 * 11)], // 11MB
      "large.jpg",
      { type: "image/jpeg" }
    );
    const response = await handler(largeFile);
    expect(response.status).toBe(413);
  });

  it("handles rate limits", async () => {
    // Simulate rate limit exceeded
    mockRateLimit.mockResolvedValue(false);
    const response = await handler();
    expect(response.status).toBe(429);
  });
});
```

### 3. Network Issues

```typescript
describe("Network Issues", () => {
  it("handles timeout", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new Error("Request timeout")
    );
    const response = await handler();
    expect(response.status).toBe(504);
  });

  it("handles service unavailable", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new Error("Service unavailable")
    );
    const response = await handler();
    expect(response.status).toBe(503);
  });
});
```

## Error Response Standards

### 1. Response Structure

```typescript
// Standard error response shape
interface ErrorResponse {
  error: string;
  details?: Record<string, unknown>;
  code?: string;
}

// Validation
expect(await response.json()).toMatchObject<ErrorResponse>({
  error: expect.any(String),
  details: expect.any(Object),
  code: expect.any(String)
});
```

### 2. Status Codes

```typescript
// Common status codes and their test cases
const statusCodes = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
  504: "Gateway Timeout"
};

Object.entries(statusCodes).forEach(([code, message]) => {
  it(`returns ${code} for ${message}`, async () => {
    // Test implementation
    expect(response.status).toBe(Number(code));
  });
});
```

## Testing Utilities

### 1. Error Generators

```typescript
// Utility for generating common errors
export const createError = {
  database: (message: string) => new Error(`Database error: ${message}`),
  validation: (field: string) => new Error(`Invalid ${field}`),
  auth: (reason: string) => new Error(`Auth failed: ${reason}`),
  filesystem: (code: string) => Object.assign(
    new Error("File system error"),
    { code }
  )
};
```

### 2. Response Validators

```typescript
// Utility for validating error responses
export const validateErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedMessage: string
) => {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toEqual({
    error: expectedMessage
  });
};
```

## Error Monitoring in Tests

### 1. Console Spies

```typescript
describe("Error Logging", () => {
  let consoleErrorSpy: vi.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("logs database errors", async () => {
    const error = new Error("Database error");
    mockPrisma.user.findUnique.mockRejectedValue(error);
    await handler();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Database error:",
      error
    );
  });
});
```

### 2. Error Tracking

```typescript
describe("Error Tracking", () => {
  it("tracks error frequency", async () => {
    const errorTracker = {
      count: 0,
      lastError: null as Error | null
    };

    try {
      await handler();
    } catch (error) {
      errorTracker.count++;
      errorTracker.lastError = error as Error;
    }

    expect(errorTracker.count).toBe(1);
    expect(errorTracker.lastError).toBeDefined();
  });
});
```

## Next Steps

1. Implement error handling test patterns for remaining untested endpoints
2. Add comprehensive error tracking to all test suites
3. Create error simulation utilities for common scenarios
4. Document error handling patterns in API documentation 
