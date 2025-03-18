# URL Management & IFrame Container Testing

## Testing Overview

This document outlines the testing strategy and implementation for URL management and IFrame container features.

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
  http.get('/api/url-groups', () => {
    return HttpResponse.json({
      groups: [
        {
          id: '1',
          name: 'Test Group',
          urls: [
            {
              id: '1',
              title: 'Test URL',
              url: 'https://example.com',
              display_order: 1
            }
          ]
        }
      ]
    });
  }),
  
  http.post('/api/urls/state', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      states: body.states.map(state => ({
        ...state,
        lastActive: new Date().toISOString()
      }))
    });
  })
];
```

## Unit Tests

### Component Tests

#### UrlGroup Component

```typescript
// __tests__/components/UrlGroup.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UrlGroup } from '@/components/url/UrlGroup';

describe('UrlGroup', () => {
  const mockGroup = {
    id: '1',
    name: 'Test Group',
    urls: [
      {
        id: '1',
        title: 'Test URL',
        url: 'https://example.com',
        display_order: 1
      }
    ]
  };

  it('renders group information correctly', () => {
    render(
      <UrlGroup
        group={mockGroup}
        activeUrl={null}
        loadedUrls={new Set()}
        onUrlSelect={() => {}}
        isExpanded={false}
        onToggle={() => {}}
      />
    );

    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles expansion correctly', () => {
    const onToggle = vi.fn();
    render(
      <UrlGroup
        group={mockGroup}
        activeUrl={null}
        loadedUrls={new Set()}
        onUrlSelect={() => {}}
        isExpanded={false}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalled();
  });
});
```

#### IframeContainer Component

```typescript
// __tests__/components/IframeContainer.test.tsx
import { render, act } from '@testing-library/react';
import { IframeContainer } from '@/components/url/IframeContainer';

describe('IframeContainer', () => {
  const mockUrls = [
    {
      id: '1',
      title: 'Test URL',
      url: 'https://example.com',
      display_order: 1
    }
  ];

  it('manages iframe visibility correctly', () => {
    const onStateChange = vi.fn();
    const { container } = render(
      <IframeContainer
        urls={mockUrls}
        activeUrl="https://example.com"
        onStateChange={onStateChange}
        onError={() => {}}
      />
    );

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeVisible();
    expect(iframe?.src).toBe('https://example.com');
  });

  it('handles errors appropriately', () => {
    const onError = vi.fn();
    render(
      <IframeContainer
        urls={mockUrls}
        activeUrl="https://example.com"
        onStateChange={() => {}}
        onError={onError}
      />
    );

    const iframe = document.querySelector('iframe');
    act(() => {
      iframe?.dispatchEvent(new Event('error'));
    });

    expect(onError).toHaveBeenCalled();
  });
});
```

### Hook Tests

#### useIframeState Hook

```typescript
// __tests__/hooks/useIframeState.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useIframeState } from '@/hooks/useIframeState';

describe('useIframeState', () => {
  it('manages loading state correctly', () => {
    const { result } = renderHook(() =>
      useIframeState({
        url: 'https://example.com',
        timeout: 5000
      })
    );

    expect(result.current.isLoaded).toBe(false);

    act(() => {
      result.current.load();
    });

    expect(result.current.isLoaded).toBe(true);
  });

  it('handles timeouts appropriately', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() =>
      useIframeState({
        url: 'https://example.com',
        timeout: 5000
      })
    );

    act(() => {
      result.current.load();
    });

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.error).toBeDefined();
    vi.useRealTimers();
  });
});
```

## Integration Tests

### URL Management Flow

```typescript
// __tests__/integration/url-management.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrlManager } from '@/components/UrlManager';

describe('URL Management Flow', () => {
  it('completes URL selection flow successfully', async () => {
    render(<UrlManager />);

    // Select URL group
    const groupHeader = screen.getByText('Test Group');
    fireEvent.click(groupHeader);

    // Select URL
    const urlItem = screen.getByText('Test URL');
    fireEvent.click(urlItem);

    // Verify iframe loaded
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeVisible();
    expect(iframe?.src).toBe('https://example.com');
  });

  it('handles long press reset correctly', async () => {
    render(<UrlManager />);

    const urlItem = screen.getByText('Test URL');
    
    // Simulate long press
    fireEvent.mouseDown(urlItem);
    await act(async () => {
      await new Promise(r => setTimeout(r, 1000));
    });
    fireEvent.mouseUp(urlItem);

    // Verify reset
    const iframe = document.querySelector('iframe');
    expect(iframe?.src).toBe('');
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

### URL Management Tests

```typescript
// e2e/url-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('URL Management', () => {
  test('manages URLs successfully', async ({ page }) => {
    await page.goto('/');
    
    // Open URL group
    await page.click('text=Test Group');
    
    // Select URL
    await page.click('text=Test URL');
    
    // Verify iframe
    const iframe = page.frameLocator('iframe').first();
    await expect(iframe).toBeVisible();
    
    // Test long press reset
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    
    // Verify reset
    await expect(iframe).not.toBeVisible();
  });

  test('handles mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('/');
    
    // Verify menu collapses
    const menu = page.locator('.url-menu');
    await expect(menu).toHaveClass(/collapsed/);
    
    // Test menu toggle
    await page.click('button:has-text("Menu")');
    await expect(menu).not.toHaveClass(/collapsed/);
  });
});
```

## Test Coverage Requirements

1. Component Coverage
   - Test all URL group interactions
   - Verify IFrame state management
   - Test loading states
   - Verify error handling
   - Test mobile responsiveness

2. Hook Coverage
   - Test state management
   - Verify timeout handling
   - Test cleanup functions
   - Verify event handling
   - Test error recovery

3. Integration Coverage
   - Test URL selection flow
   - Verify state synchronization
   - Test long press behavior
   - Check mobile detection
   - Verify error propagation

4. E2E Coverage
   - Test complete user flows
   - Verify mobile experience
   - Test performance metrics
   - Check error scenarios
   - Verify state persistence

## Best Practices

1. Test Organization
   - Group by feature
   - Use descriptive names
   - Follow AAA pattern
   - Keep tests focused
   - Document edge cases

2. Test Data
   - Use realistic URLs
   - Test various states
   - Mock network calls
   - Handle timeouts
   - Test error cases

3. Performance Testing
   - Monitor load times
   - Test memory usage
   - Check CPU utilization
   - Verify cleanup
   - Test concurrent loads

4. Mobile Testing
   - Test touch events
   - Verify responsive design
   - Check orientation changes
   - Test menu behavior
   - Verify mobile URLs 
