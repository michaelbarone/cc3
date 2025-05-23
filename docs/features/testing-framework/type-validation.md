# API Response Type Validation

## Overview

This document describes the approach for validating API response structures using TypeScript-based runtime validation in our test suite. The validation system ensures that API responses conform to their expected TypeScript interfaces, catching data structure issues early.

## Validation Utilities

We use a custom validation system defined in `test/helpers/type-validation.ts` that provides runtime type checking for API responses. This approach bridges the gap between TypeScript's compile-time type checking and runtime validation of actual response data.

### Key Components

1. **TypeValidator Interface**: Core interface for type validators
   ```typescript
   interface TypeValidator<T> {
     validate(value: unknown): value is T;
     getErrors(): ValidationError[];
   }
   ```

2. **Validator Factory Functions**: Create validators for different data types
   ```typescript
   // Primitive validators
   validators.string
   validators.number
   validators.boolean
   validators.isoDate
   
   // Complex validators
   validators.array(itemValidator)
   validators.object(schema)
   ```

3. **Validation Functions**: Helpers to apply validators to responses
   ```typescript
   // Check validity without throwing
   validateApiResponse<T>(response, validator, options)
   
   // Assert validity and throw if invalid
   assertApiResponse<T>(response, validator, path)
   
   // Expect valid response in tests
   expectApiResponse<T>(response, validator, path)
   ```

## Shared Validators

Common validators for frequently used response structures are available in the `test/helpers/validators` directory:

### Basic Response Types

```typescript
import { errorResponseValidator, successResponseValidator, messageResponseValidator } from "@/test/helpers/validators";

// Error response: { error: string }
expectApiResponse(data, errorResponseValidator, "Error response");

// Success response: { success: boolean }
expectApiResponse(data, successResponseValidator, "Success response");

// Message response: { message: string }
expectApiResponse(data, messageResponseValidator, "Message response");
```

### Domain-Specific Validators

```typescript
import { 
  createUserValidator, 
  createUrlValidator, 
  createUrlGroupValidator,
  createPaginatedValidator
} from "@/test/helpers/validators";

// User validation
const userValidator = createUserValidator();
expectApiResponse(userData, userValidator, "User data");

// URL validation
const urlValidator = createUrlValidator();
expectApiResponse(urlData, urlValidator, "URL data");

// URL Group validation
const urlGroupValidator = createUrlGroupValidator();
expectApiResponse(groupData, urlGroupValidator, "URL Group data");

// Paginated data validation
const paginatedUsersValidator = createPaginatedValidator(userValidator);
expectApiResponse(paginatedData, paginatedUsersValidator, "Paginated users");
```

### Error Cases Testing

```typescript
import { invalidDataValidators } from "@/test/helpers/validators";

// Validate missing required field response
expectApiResponse(errorData, invalidDataValidators.missingRequiredField, "Missing field error");

// Validate invalid data type response
expectApiResponse(errorData, invalidDataValidators.invalidDataType, "Invalid type error");
```

## Implementation Pattern

### 1. Define Response Type Validators

```typescript
// Error response validator
const errorResponseValidator: TypeValidator<{ error: string }> = validators.object({
  error: validators.string,
});

// Success response validator
const successResponseValidator: TypeValidator<{ success: boolean }> = validators.object({
  success: validators.boolean,
});

// Complex data response validator
const userResponseValidator: TypeValidator<User> = validators.object({
  id: validators.string,
  username: validators.string,
  isAdmin: validators.boolean,
  createdAt: validators.isoDate,
  updatedAt: validators.isoDate,
  lastLoginAt: validators.union(validators.isoDate, validators.null),
});
```

### 2. Apply Validation in Tests

```typescript
it("returns user data", async () => {
  const response = await GET("/api/users/me");
  const data = await debugResponse(response);
  
  expect(response.status).toBe(200);
  
  // Validate response against schema
  expectApiResponse(data, userResponseValidator, "User response");
  
  // Additional assertions
  expect(data.username).toBe("testuser");
});
```

### 3. Handle Nested Structures

```typescript
const urlGroupsValidator = validators.object({
  id: validators.string,
  name: validators.string,
  urls: validators.array(
    validators.object({
      id: validators.string,
      title: validators.string,
      url: validators.string,
      displayOrder: validators.number,
    })
  ),
});
```

## Best Practices

1. **Use Shared Validators**: Leverage the shared validators in `test/helpers/validators` for common patterns
2. **Reuse Validators**: Define common validators centrally for reuse across tests
3. **Path Context**: Provide descriptive path context for easier error identification
4. **Validation First**: Apply validation before specific assertions to catch structural issues early
5. **Comprehensive Coverage**: Include validation for both success and error responses
6. **Nested Validation**: Use composition for complex nested object validation
7. **Performance Awareness**: Apply validation inside the performance measurement blocks

## Examples

### Basic Error Response Validation

```typescript
it("returns 403 when not authorized", async () => {
  const testTimer = measureTestTime("unauthorized-test");
  try {
    const response = await POST(request);
    const data = await debugResponse(response);

    expect(response.status).toBe(403);
    expectApiResponse(data, errorResponseValidator, "POST 403 response");
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } finally {
    testTimer.end();
  }
});
```

### Complex Data Validation

```typescript
it("returns statistics data", async () => {
  const testTimer = measureTestTime("statistics-test");
  try {
    const response = await GET("/api/admin/statistics");
    const data = await debugResponse(response);

    expect(response.status).toBe(200);
    expectApiResponse(data, statisticsValidator, "Statistics response");
    expect(data.totalUsers).toBeGreaterThan(0);
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } finally {
    testTimer.end();
  }
});
```

## Error Handling

When validation fails, detailed error messages are produced:

```
API Response validation failed:
users.0.createdAt: Expected string with ISO date format, received number
users.1.permissions.3: Expected string, received undefined
metrics.responseTime: Expected number, received string
```

These detailed error messages help quickly identify what part of the response doesn't match the expected structure.

## Integration with Performance Monitoring

Validation should be integrated with our performance monitoring approach:

```typescript
it("validates response within time constraints", async () => {
  const testTimer = measureTestTime("validate-response");
  try {
    const response = await GET("/api/data");
    const data = await debugResponse(response);

    const validationTimer = measureTestTime("validate-structure");
    try {
      expectApiResponse(data, dataValidator, "Data response");
    } finally {
      validationTimer.end();
    }

    expect(validationTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
    expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
  } finally {
    testTimer.end();
  }
});
```

## Extending Validators

To add new shared validators:

1. Add them to the appropriate file in `test/helpers/validators/`
2. For common API responses, use `common.ts`
3. For domain-specific validators, consider creating separate files
4. Export them from the `index.ts` file
5. Document their usage in this guide

## Implementation Status

Type validation has been implemented for the following API endpoints:

- ✅ `/api/admin/backup` (GET, POST)
- ✅ `/api/first-run/restore` (POST)
- ⬜ `/api/admin/url-groups/[id]/urls` (GET, POST, PUT, DELETE)
- ⬜ `/api/admin/url-groups/[id]/urls/[urlId]` (GET, PATCH, DELETE)

## Next Steps

1. Continue implementing type validation for all remaining API endpoints
2. Create shared validators for common response patterns
3. Add runtime validation to API routes for request validation
4. Consider generating validators from TypeScript interfaces automatically 
