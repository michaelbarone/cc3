# Authentication & User Management Testing

## Testing Overview

This document outlines the testing strategy and implementation for the authentication and user management features.

## Test Environment Setup

### Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0",
    "@playwright/test": "^1.40.0",
    "happy-dom": "^12.0.0"
  }
}
```

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.next/', 'tests/']
    }
  }
});
```

### MSW Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/auth/users', () => {
    return HttpResponse.json({
      users: [
        {
          id: '1',
          username: 'test-user',
          has_password: true,
          avatar_url: null
        }
      ]
    });
  }),
  
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.password === 'valid-password') {
      return HttpResponse.json({
        success: true,
        user: {
          id: '1',
          username: 'test-user',
          is_admin: false
        }
      });
    }
    return new HttpResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid credentials'
      }),
      { status: 401 }
    );
  })
];
```

## Unit Tests

### Component Tests

#### UserTile Component

```typescript
// __tests__/components/UserTile.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserTile } from '@/components/auth/UserTile';

describe('UserTile', () => {
  const mockUser = {
    id: '1',
    username: 'test-user',
    has_password: true
  };

  it('renders user information correctly', () => {
    render(
      <UserTile
        user={mockUser}
        isSelected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText('test-user')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles selection correctly', () => {
    const onSelect = vi.fn();
    render(
      <UserTile
        user={mockUser}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

#### PasswordForm Component

```typescript
// __tests__/components/PasswordForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordForm } from '@/components/auth/PasswordForm';

describe('PasswordForm', () => {
  it('submits password correctly', async () => {
    const onSubmit = vi.fn();
    render(
      <PasswordForm
        userId="1"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    await userEvent.type(
      screen.getByLabelText(/password/i),
      'test-password'
    );
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith('test-password');
  });

  it('shows validation error for empty password', async () => {
    render(
      <PasswordForm
        userId="1"
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});
```

### Hook Tests

#### useAuth Hook

```typescript
// __tests__/hooks/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  it('handles login correctly', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('1', 'valid-password');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles logout correctly', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

## Integration Tests

### Authentication Flow

```typescript
// __tests__/integration/auth-flow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/app/login/page';

describe('Authentication Flow', () => {
  it('completes login flow successfully', async () => {
    render(<LoginPage />);

    // Select user
    const userTile = screen.getByText('test-user');
    fireEvent.click(userTile);

    // Enter password
    await userEvent.type(
      screen.getByLabelText(/password/i),
      'valid-password'
    );

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify redirect
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('handles invalid credentials', async () => {
    render(<LoginPage />);

    // Select user
    const userTile = screen.getByText('test-user');
    fireEvent.click(userTile);

    // Enter wrong password
    await userEvent.type(
      screen.getByLabelText(/password/i),
      'wrong-password'
    );

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify error message
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

## E2E Tests

### Playwright Configuration

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'Mobile Safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 }
      }
    }
  ]
};

export default config;
```

### Authentication Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Select user
    await page.click('text=test-user');
    
    // Enter password
    await page.fill('[type="password"]', 'valid-password');
    
    // Submit form
    await page.click('button:has-text("Login")');
    
    // Verify redirect
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, test-user')).toBeVisible();
  });

  test('profile settings flow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.click('text=test-user');
    await page.fill('[type="password"]', 'valid-password');
    await page.click('button:has-text("Login")');

    // Navigate to settings
    await page.click('text=Settings');
    
    // Update profile
    await page.fill('[name="username"]', 'updated-username');
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('text=updated-username')).toBeVisible();
  });
});
```

## Test Coverage Requirements

1. Component Coverage
   - All components must have unit tests
   - Minimum 90% branch coverage
   - Test all state transitions
   - Verify error handling

2. Integration Coverage
   - Test all authentication flows
   - Verify form validation
   - Test API interactions
   - Check state persistence

3. E2E Coverage
   - Test critical user journeys
   - Verify mobile responsiveness
   - Test cross-browser compatibility
   - Check error recovery

## Best Practices

1. Test Organization
   - Group tests by feature
   - Use descriptive test names
   - Follow AAA pattern
   - Keep tests focused

2. Test Data
   - Use realistic test data
   - Reset state between tests
   - Mock external dependencies
   - Use test factories

3. Assertions
   - Make assertions specific
   - Test component contracts
   - Verify state changes
   - Check error states

4. Performance
   - Keep tests fast
   - Minimize setup/teardown
   - Use appropriate tools
   - Parallelize when possible 
