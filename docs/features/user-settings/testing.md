# User Settings & Preferences Testing

## Test Environment Setup

### Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.2.0",
    "msw": "^2.0.13",
    "happy-dom": "^13.3.8",
    "@playwright/test": "^1.41.0"
  }
}
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.test.tsx'
      ]
    }
  }
});
```

### MSW Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Get user preferences
  http.get('/api/user/preferences', () => {
    return HttpResponse.json({
      preferences: {
        menuPosition: 'side',
        themeMode: 'light'
      }
    });
  }),

  // Update user preferences
  http.post('/api/user/preferences', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      preferences: {
        ...data
      },
      success: true
    });
  })
];
```

## Unit Tests

### Theme Management

```typescript
// __tests__/hooks/useTheme.test.ts
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/app/lib/hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggles theme', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('dark');
  });

  it('persists theme preference', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
```

### User Preferences Hook

```typescript
// __tests__/hooks/useUserPreferences.test.ts
import { renderHook, act } from '@testing-library/react';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';

describe('useUserPreferences', () => {
  it('loads initial preferences', async () => {
    const { result } = renderHook(() => useUserPreferences());
    
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.preferences).toEqual({
      menuPosition: 'side',
      themeMode: 'light'
    });
  });

  it('updates menu position', async () => {
    const { result } = renderHook(() => useUserPreferences());
    
    await act(async () => {
      await result.current.updateMenuPosition('top');
    });
    
    expect(result.current.preferences.menuPosition).toBe('top');
  });

  it('handles update errors', async () => {
    server.use(
      http.post('/api/user/preferences', () => {
        return HttpResponse.error();
      })
    );
    
    const { result } = renderHook(() => useUserPreferences());
    
    await act(async () => {
      await expect(result.current.updateThemeMode('dark')).rejects.toThrow();
    });
    
    expect(result.current.error).toBeTruthy();
  });
});
```

### Settings Components

```typescript
// __tests__/components/AppearanceSettings.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceSettingsPage } from '@/app/settings/appearance/page';

describe('AppearanceSettingsPage', () => {
  it('renders theme options', () => {
    render(<AppearanceSettingsPage />);
    
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Light Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark Mode')).toBeInTheDocument();
  });

  it('updates theme preference', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettingsPage />);
    
    await user.click(screen.getByLabelText('Dark Mode'));
    
    expect(screen.getByText('Theme updated successfully')).toBeInTheDocument();
  });

  it('shows error message on update failure', async () => {
    server.use(
      http.post('/api/user/preferences', () => {
        return HttpResponse.error();
      })
    );
    
    const user = userEvent.setup();
    render(<AppearanceSettingsPage />);
    
    await user.click(screen.getByLabelText('Dark Mode'));
    
    expect(screen.getByText('Failed to update theme')).toBeInTheDocument();
  });
});
```

## Integration Tests

### Theme Synchronization

```typescript
// __tests__/integration/theme-sync.test.tsx
import { render, screen } from '@testing-library/react';
import { AppLayout } from '@/app/components/layout/AppLayout';
import { ThemeProvider } from '@/app/theme/theme-provider';

describe('Theme Synchronization', () => {
  it('syncs theme across components', async () => {
    const { user } = render(
      <ThemeProvider>
        <AppLayout>
          <AppearanceSettingsPage />
        </AppLayout>
      </ThemeProvider>
    );
    
    // Change theme
    await user.click(screen.getByLabelText('Dark Mode'));
    
    // Verify theme applied to layout
    expect(document.body).toHaveClass('dark-theme');
    
    // Verify theme persisted
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
```

### Menu Position Updates

```typescript
// __tests__/integration/menu-position.test.tsx
describe('Menu Position Updates', () => {
  it('updates menu layout on preference change', async () => {
    const { user } = render(
      <AppLayout>
        <AppearanceSettingsPage />
      </AppLayout>
    );
    
    // Change menu position
    await user.click(screen.getByLabelText('Top Menu'));
    
    // Verify menu position
    expect(screen.getByTestId('menu-bar')).toHaveClass('top-position');
    
    // Verify mobile fallback
    window.innerWidth = 400; // Mobile width
    fireEvent(window, new Event('resize'));
    
    expect(screen.getByTestId('menu-bar')).toHaveClass('side-position');
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
      name: 'Mobile Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 }
      }
    }
  ]
};

export default config;
```

### Settings Workflow Tests

```typescript
// e2e/settings.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Settings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/appearance');
  });

  test('completes theme change workflow', async ({ page }) => {
    // Change theme
    await page.click('[aria-label="Dark Theme"]');
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Verify persistence
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/dark/);
  });

  test('completes menu position workflow', async ({ page }) => {
    // Change menu position
    await page.click('[aria-label="Top Menu"]');
    await expect(page.locator('#main-menu')).toHaveClass(/top/);
    
    // Verify persistence
    await page.reload();
    await expect(page.locator('#main-menu')).toHaveClass(/top/);
  });

  test('handles mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify menu position
    await expect(page.locator('#main-menu')).toHaveClass(/side/);
    
    // Try changing menu position
    await page.click('[aria-label="Top Menu"]');
    await expect(page.locator('#main-menu')).toHaveClass(/side/);
  });
});
```

## Test Coverage Requirements

1. Component Coverage
   - Theme toggle functionality
   - Menu position selection
   - Settings form validation
   - Loading states
   - Error handling

2. Hook Coverage
   - Theme management
   - Preference persistence
   - API integration
   - Error recovery
   - Cache management

3. Integration Coverage
   - Theme synchronization
   - Menu position updates
   - Mobile responsiveness
   - Settings persistence

4. E2E Coverage
   - Complete settings workflows
   - Cross-browser compatibility
   - Mobile adaptation
   - Error scenarios

## Best Practices

1. Test Organization
   - Group by feature
   - Clear test descriptions
   - Isolated test cases
   - Proper setup/teardown

2. Test Data
   - Realistic scenarios
   - Edge cases
   - Error conditions
   - Mobile contexts

3. Performance Testing
   - Load time metrics
   - Update latency
   - Cache efficiency
   - Mobile performance

4. Error Testing
   - Network failures
   - Validation errors
   - State conflicts
   - Recovery flows 
