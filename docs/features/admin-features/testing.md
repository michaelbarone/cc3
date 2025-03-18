# Application Configuration & Admin Dashboard Testing

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
  http.get('/api/admin/app-config', () => {
    return HttpResponse.json({
      id: '1',
      appName: 'Test App',
      appLogo: null,
      favicon: null,
      loginTheme: 'light',
      registrationEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }),

  http.patch('/api/admin/app-config', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      success: true,
      config: {
        ...data,
        id: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }),

  http.get('/api/admin/statistics', () => {
    return HttpResponse.json({
      users: {
        total: 10,
        active: 5,
        admins: 2
      },
      urls: {
        total: 20,
        withMobileVersion: 10,
        desktopOnly: 10,
        orphaned: 0
      },
      userPreferences: {
        themeDistribution: { light: 6, dark: 4 },
        menuPositionDistribution: { side: 7, top: 3 }
      },
      activity: {
        lastDay: 8,
        lastWeek: 15,
        lastMonth: 30
      }
    });
  })
];
```

## Unit Tests

### Configuration Components

```typescript
// __tests__/components/AppConfigPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AppConfigPage } from '@/app/admin/app-config/page';
import { vi } from 'vitest';

describe('AppConfigPage', () => {
  it('renders configuration form with current values', () => {
    render(<AppConfigPage />);
    
    expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Login Theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Registration')).toBeInTheDocument();
  });

  it('updates application name', async () => {
    const { user } = render(<AppConfigPage />);
    
    const input = screen.getByLabelText('Application Name');
    await user.clear(input);
    await user.type(input, 'New App Name');
    await user.click(screen.getByText('Save'));
    
    expect(screen.getByText('Configuration updated')).toBeInTheDocument();
  });
});
```

### Database Management

```typescript
// __tests__/components/DatabaseManagement.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabaseManagement } from '@/app/admin/database/page';
import { vi } from 'vitest';

describe('DatabaseManagement', () => {
  it('creates backup successfully', async () => {
    const { user } = render(<DatabaseManagement />);
    
    await user.click(screen.getByText('Create Backup'));
    
    expect(screen.getByText('Backup created successfully')).toBeInTheDocument();
  });

  it('handles restore confirmation', async () => {
    const { user } = render(<DatabaseManagement />);
    
    const file = new File(['backup data'], 'backup.zip', { type: 'application/zip' });
    const input = screen.getByLabelText('Upload Backup');
    
    await user.upload(input, file);
    await user.click(screen.getByText('Restore'));
    
    expect(screen.getByText('Confirm Restore')).toBeInTheDocument();
  });
});
```

### Statistics Dashboard

```typescript
// __tests__/components/AdminDashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { AdminDashboard } from '@/app/admin/page';
import { vi } from 'vitest';

describe('AdminDashboard', () => {
  it('displays system statistics', async () => {
    render(<AdminDashboard />);
    
    expect(await screen.findByText('Total Users: 10')).toBeInTheDocument();
    expect(screen.getByText('Active Users: 5')).toBeInTheDocument();
    expect(screen.getByText('Admin Users: 2')).toBeInTheDocument();
  });

  it('updates statistics periodically', async () => {
    vi.useFakeTimers();
    render(<AdminDashboard />);
    
    vi.advanceTimersByTime(60000);
    
    expect(screen.getByText('Last updated:')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

## Integration Tests

### Configuration Flow

```typescript
// __tests__/integration/configuration.test.tsx
import { render, screen } from '@testing-library/react';
import { AppConfigPage } from '@/app/admin/app-config/page';
import { vi } from 'vitest';

describe('Configuration Flow', () => {
  it('updates multiple settings in sequence', async () => {
    const { user } = render(<AppConfigPage />);
    
    // Update app name
    await user.type(screen.getByLabelText('Application Name'), 'Test App');
    await user.click(screen.getByText('Save'));
    
    // Update theme
    await user.click(screen.getByLabelText('Dark Theme'));
    await user.click(screen.getByText('Save'));
    
    // Update registration
    await user.click(screen.getByLabelText('Enable Registration'));
    await user.click(screen.getByText('Save'));
    
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
  });
});
```

### Database Operations

```typescript
// __tests__/integration/database.test.tsx
import { render, screen } from '@testing-library/react';
import { DatabaseManagement } from '@/app/admin/database/page';
import { vi } from 'vitest';

describe('Database Operations', () => {
  it('performs backup and restore cycle', async () => {
    const { user } = render(<DatabaseManagement />);
    
    // Create backup
    await user.click(screen.getByText('Create Backup'));
    const backupFile = await screen.findByText(/backup-\d{8}-\d{6}\.zip/);
    
    // Restore from backup
    await user.click(backupFile);
    await user.click(screen.getByText('Restore'));
    await user.click(screen.getByText('Confirm'));
    
    expect(screen.getByText('Restore completed')).toBeInTheDocument();
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

### Admin Dashboard Tests

```typescript
// e2e/admin-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    // Login as admin
  });

  test('navigates through all admin sections', async ({ page }) => {
    // App Config
    await page.click('text=App Configuration');
    await expect(page.locator('h1')).toHaveText('Application Configuration');
    
    // Database
    await page.click('text=Database Management');
    await expect(page.locator('h1')).toHaveText('Database Management');
    
    // Statistics
    await page.click('text=Statistics');
    await expect(page.locator('h1')).toHaveText('System Statistics');
  });

  test('completes configuration workflow', async ({ page }) => {
    await page.goto('/admin/app-config');
    
    // Update app name
    await page.fill('[name="appName"]', 'E2E Test App');
    await page.click('text=Save');
    
    // Upload logo
    const logo = 'test-assets/logo.png';
    await page.setInputFiles('input[type="file"]', logo);
    await page.click('text=Upload');
    
    // Verify changes
    await expect(page.locator('text=Configuration saved')).toBeVisible();
  });
});
```

## Test Coverage Requirements

1. Component Coverage
   - All configuration form components
   - Database management interface
   - Statistics dashboard components
   - File upload components

2. Integration Coverage
   - Complete configuration workflows
   - Database backup/restore cycle
   - Statistics data flow
   - User preference synchronization

3. E2E Coverage
   - Admin dashboard navigation
   - Configuration management
   - Database operations
   - Statistics viewing
   - Mobile responsiveness

## Best Practices

1. Test Organization
   - Group tests by feature
   - Use descriptive test names
   - Maintain test isolation
   - Clean up after tests

2. Data Management
   - Use realistic test data
   - Reset state between tests
   - Mock external services
   - Handle async operations

3. Performance Testing
   - Monitor render times
   - Test data loading
   - Verify caching
   - Check memory usage

4. Error Handling
   - Test error states
   - Verify error messages
   - Check recovery flows
   - Test boundary conditions 
