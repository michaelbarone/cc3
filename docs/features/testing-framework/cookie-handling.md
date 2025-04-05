# Cookie Handling Patterns in Tests

## Overview

This document outlines the standard patterns for handling cookies in our test suite, particularly focusing on authentication and session management.

## Standard Cookie Store Mock

We use a standardized cookie store mock implementation across our tests:

```typescript
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
```

### Using the Mock Helper

For consistency, use the helper function from `app/lib/test/mocks.ts`:

```typescript
import { setupTestMocks } from './mocks';

const { cookieStore } = setupTestMocks();
```

## Common Test Patterns

### 1. Authentication Tests

```typescript
describe('Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue({ value: 'mock-token' });
  });

  it('handles valid authentication', async () => {
    // Setup
    const token = 'valid-token';
    mockCookieStore.get.mockReturnValue({ value: token });

    // Test authentication
    const response = await getSession();
    
    // Verify
    expect(mockCookieStore.get).toHaveBeenCalledWith('auth_token');
    expect(response.status).toBe(200);
  });

  it('handles missing token', async () => {
    // Setup
    mockCookieStore.get.mockReturnValue(undefined);

    // Test
    const response = await getSession();
    
    // Verify
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
  });
});
```

### 2. Session Management

```typescript
describe('Session Management', () => {
  it('sets session cookie on login', async () => {
    const token = 'new-session-token';
    
    // Test login
    await login(/* login request */);

    // Verify cookie was set
    expect(mockCookieStore.set).toHaveBeenCalledWith({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
  });

  it('clears session cookie on logout', async () => {
    // Test logout
    await logout();

    // Verify cookie was deleted
    expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_token');
  });
});
```

### 3. Cookie Attributes Testing

```typescript
describe('Cookie Attributes', () => {
  it('sets secure cookie in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Test login
    await login(/* login request */);

    // Verify secure attribute
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});
```

## Best Practices

1. **Mock Setup**
   - Always use the standard mock cookie store implementation
   - Clear mocks in `beforeEach` blocks
   - Restore original implementations in `afterEach`

2. **Token Handling**
   - Use consistent token formats in tests
   - Test both valid and invalid token scenarios
   - Include token expiration tests

3. **Error Cases**
   - Test missing cookies
   - Test malformed cookies
   - Test expired tokens
   - Test invalid token formats

4. **Security Considerations**
   - Verify httpOnly flag
   - Test sameSite attribute
   - Verify secure flag in production
   - Test cookie expiration

## Common Pitfalls

1. **Incomplete Cleanup**
   ```typescript
   // BAD: Cookie store not cleared between tests
   describe('Test Suite', () => {
     it('test1', () => {
       mockCookieStore.get.mockReturnValue({ value: 'token' });
     });
     
     it('test2', () => {
       // Previous mock still active!
     });
   });

   // GOOD: Proper cleanup
   describe('Test Suite', () => {
     beforeEach(() => {
       vi.clearAllMocks();
     });
     
     it('test1', () => {
       mockCookieStore.get.mockReturnValue({ value: 'token' });
     });
     
     it('test2', () => {
       // Fresh mock state
     });
   });
   ```

2. **Inconsistent Mock Implementation**
   ```typescript
   // BAD: Inconsistent mock implementation
   const badMockCookieStore = {
     get: () => ({ value: 'token' }), // Not a mock function!
   };

   // GOOD: Consistent mock implementation
   const goodMockCookieStore = {
     get: vi.fn().mockReturnValue({ value: 'token' }),
   };
   ```

3. **Missing Edge Cases**
   ```typescript
   // BAD: Only testing happy path
   it('handles authentication', async () => {
     mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
     const response = await getSession();
     expect(response.status).toBe(200);
   });

   // GOOD: Testing edge cases
   describe('authentication', () => {
     it('handles valid token', async () => {
       mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
       const response = await getSession();
       expect(response.status).toBe(200);
     });

     it('handles missing token', async () => {
       mockCookieStore.get.mockReturnValue(undefined);
       const response = await getSession();
       expect(response.status).toBe(200);
       expect(await response.json()).toEqual({ user: null });
     });

     it('handles invalid token', async () => {
       mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
       const response = await getSession();
       expect(response.status).toBe(200);
       expect(await response.json()).toEqual({ user: null });
     });
   });
   ```

## Integration with MSW

When using MSW for API mocking:

```typescript
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.cookie('auth_token', 'test-token', {
        httpOnly: true,
        sameSite: 'strict'
      }),
      ctx.json({ success: true })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Testing Utilities

Common utilities for cookie testing:

```typescript
// Helper to create mock cookie store with initial state
export function createMockCookieStore(initialCookies?: Record<string, string>) {
  const store = {
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  if (initialCookies) {
    for (const [name, value] of Object.entries(initialCookies)) {
      store.get.mockImplementation((key) => 
        key === name ? { value } : undefined
      );
    }
  }

  return store;
}

// Helper to verify cookie attributes
export function verifyCookieAttributes(setCookieCall: any) {
  expect(setCookieCall).toEqual(
    expect.objectContaining({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    })
  );
}
``` 
