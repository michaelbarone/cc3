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

  it('handles long press unload correctly', async () => {
    render(<UrlManager />);

    // Select URL first
    const urlItem = screen.getByText('Test URL');
    fireEvent.click(urlItem);
    
    // Verify loaded state
    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeVisible();
      expect(iframe?.src).toBe('https://example.com');
    });
    
    // Simulate long press with 'unload' action type
    fireEvent.mouseDown(urlItem);
    await act(async () => {
      await new Promise(r => setTimeout(r, 800)); // Slightly shorter than reset
    });
    fireEvent.mouseUp(urlItem);

    // Verify iframe is still visible but content is unloaded
    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeVisible(); // Still visible
      expect(iframe?.src).toBe(''); // But content is unloaded
      expect(urlItem).toHaveClass('active-unloaded'); // URL menu item shows unloaded state
    });
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

## Testing Strategies

### Unit Testing Approach
- Use Vitest for unit and integration tests
- Isolate components with mock data
- Test state transitions and event handlers
- Use Testing Library for component interaction
- Verify DOM updates

### Integration Testing Approach
- Test URL menu with IFrame interactions
- Verify state synchronization
- Test error handling and recovery
- Validate accessibility features
- Test mobile and desktop views

### Testing IFrame Lifecycle States

To properly test the IFrame container's complex state management system, we need to test each state transition and verify the correct behavior in each state. Below is a comprehensive testing approach for the IFrame lifecycle:

#### Setting Up IFrame Lifecycle Tests

```typescript
// __tests__/hooks/useIframeLifecycle.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useIframeLifecycle } from '@/components/iframe/hooks/useIframeLifecycle';
import { IframeProvider } from '@/components/iframe/state/IframeContext';

// Mock dependencies
jest.mock('./useGlobalIframeContainer', () => ({
  useGlobalIframeContainer: () => ({
    createIframe: jest.fn(() => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('data-testid', 'test-iframe');
      return iframe;
    }),
    removeIframe: jest.fn(),
    updateIframeVisibility: jest.fn(),
  }),
}));

describe('useIframeLifecycle', () => {
  const wrapper = ({ children }) => (
    <IframeProvider>{children}</IframeProvider>
  );

  it('should handle the iframe loading lifecycle', async () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    const onUnload = jest.fn();
    
    const { result } = renderHook(
      () => useIframeLifecycle('url-123', { onLoad, onError, onUnload }),
      { wrapper }
    );
    
    // Test initial state
    expect(result.current).toHaveProperty('loadIframe');
    expect(result.current).toHaveProperty('unloadIframe');
    expect(result.current).toHaveProperty('resetIframe');
    
    // Test loading
    act(() => {
      result.current.loadIframe('url-123', 'https://example.com');
    });
    
    // Simulate load event
    const iframe = document.querySelector('[data-testid="test-iframe"]');
    act(() => {
      iframe.src = 'https://example.com';
      iframe.dispatchEvent(new Event('load'));
    });
    
    expect(onLoad).toHaveBeenCalledWith('url-123');
    
    // Test unloading
    act(() => {
      result.current.unloadIframe('url-123');
    });
    
    expect(onUnload).toHaveBeenCalledWith('url-123');
    expect(iframe.src).toBe('');
    
    // Test reset
    act(() => {
      result.current.resetIframe('url-123');
    });
    
    // Verify src is reset
    expect(iframe.src).toBe('about:blank');
  });
});
```

#### Testing State Transitions

```typescript
// __tests__/components/IframeContainer.test.tsx
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import IframeContainer from '@/components/iframe/IframeContainer';

describe('IframeContainer State Transitions', () => {
  it('should transition through all iframe states correctly', async () => {
    // Mock URL groups data
    const urlGroups = [
      {
        id: 'group-1',
        name: 'Test Group',
        urls: [
          { id: 'url-1', title: 'Test URL', url: 'https://example.com' },
        ],
      },
    ];
    
    const { getByText, queryByTestId } = render(
      <IframeContainer urlGroups={urlGroups} />
    );
    
    // Initial state: inactive-unloaded
    expect(queryByTestId('iframe-url-1')).toBeNull();
    
    // Click URL: inactive-unloaded → active-unloaded
    const urlButton = getByText('Test URL');
    fireEvent.click(urlButton);
    
    // Verify loading state
    await waitFor(() => {
      expect(queryByTestId('loading-indicator')).toBeInTheDocument();
    });
    
    // Simulate load: active-unloaded → active-loaded
    const iframe = document.querySelector('iframe');
    act(() => {
      iframe.dispatchEvent(new Event('load'));
    });
    
    // Verify loaded state
    await waitFor(() => {
      expect(queryByTestId('loading-indicator')).not.toBeInTheDocument();
      expect(urlButton).toHaveClass('active-loaded');
    });
    
    // Test error state: simulate load error
    act(() => {
      iframe.dispatchEvent(new Event('error'));
    });
    
    // Verify error state
    await waitFor(() => {
      expect(queryByTestId('error-indicator')).toBeInTheDocument();
    });
    
    // Test long press reset
    act(() => {
      // Simulate long press
      fireEvent.mouseDown(urlButton);
      // Fast-forward timers to trigger long press
      jest.advanceTimersByTime(1000);
      fireEvent.mouseUp(urlButton);
    });
    
    // Verify reset state
    await waitFor(() => {
      expect(urlButton).not.toHaveClass('active-loaded');
      expect(iframe.src).toBe('');
    });

    it('should handle manual unload via long press correctly', async () => {
      const urlGroups = [
        {
          id: 'group-1',
          name: 'Test Group',
          urls: [
            { id: 'url-1', title: 'Test URL', url: 'https://example.com' },
          ],
        },
      ];
      
      const { getByText, queryByTestId } = render(
        <IframeContainer urlGroups={urlGroups} />
      );
      
      // Click URL to load iframe
      const urlButton = getByText('Test URL');
      fireEvent.click(urlButton);
      
      // Simulate load completion
      const iframe = document.querySelector('iframe');
      act(() => {
        iframe.dispatchEvent(new Event('load'));
      });
      
      // Verify loaded state
      await waitFor(() => {
        expect(urlButton).toHaveClass('active-loaded');
      });
      
      // Test long press unload (medium duration press)
      act(() => {
        // Simulate long press with unload action type
        fireEvent.mouseDown(urlButton, { 
          detail: { actionType: 'unload' } 
        });
        // Medium duration press
        jest.advanceTimersByTime(800);
        fireEvent.mouseUp(urlButton);
      });
      
      // Verify unloaded state - iframe is still visible but content is cleared
      await waitFor(() => {
        expect(urlButton).toHaveClass('active-unloaded');
        expect(iframe.src).toBe('');
        expect(iframe).toBeVisible();
      });
    });
  });
});
```

#### Testing Resource Management

```typescript
// __tests__/iframe-resource-management.test.tsx
import { render, act } from '@testing-library/react';
import IframeContainer from '@/components/iframe/IframeContainer';

describe('IFrame Resource Management', () => {
  it('should unload least recently used iframes when exceeding limit', async () => {
    // Mock URL groups with many URLs
    const urlGroups = [
      {
        id: 'group-1',
        name: 'Test Group',
        urls: Array.from({ length: 10 }, (_, i) => ({
          id: `url-${i}`,
          title: `URL ${i}`,
          url: `https://example.com/${i}`,
        })),
      },
    ];
    
    const { getAllByRole } = render(
      <IframeContainer urlGroups={urlGroups} />
    );
    
    // Click on 6 different URLs (assuming maxCachedFrames is 5)
    const urlButtons = getAllByRole('button');
    
    for (let i = 0; i < 6; i++) {
      act(() => {
        fireEvent.click(urlButtons[i]);
        // Simulate load
        const iframe = document.querySelector(`iframe[data-iframe-id="url-${i}"]`);
        if (iframe) {
          iframe.dispatchEvent(new Event('load'));
        }
      });
    }
    
    // Verify the first URL's iframe was unloaded
    await waitFor(() => {
      const firstIframe = document.querySelector('iframe[data-iframe-id="url-0"]');
      expect(firstIframe.src).toBe('');
    });
  });

  it('should properly clean up resources on unmount', () => {
    // Render and then unmount
    const { unmount } = render(
      <IframeContainer urlGroups={[]} />
    );
    
    // Get reference to container before unmount
    const container = document.getElementById('global-iframe-container');
    expect(container).toBeInTheDocument();
    
    // Unmount component
    unmount();
    
    // Verify event listeners are removed
    // (would need to spy on addEventListener/removeEventListener)
    
    // Note: The global container remains in the DOM even after unmount
    // as it's designed to be a singleton
  });
});
```

## End-to-End Testing

For end-to-end testing, focus on these key IFrame lifecycle scenarios:

1. **Loading and Navigation**
   - Verify iframes load correctly
   - Test navigation between URL groups
   - Validate state preservation when switching between URLs
   
2. **Error Handling**
   - Test invalid URL handling
   - Verify error messages display correctly
   - Test retry functionality
   
3. **Resource Management**
   - Validate memory usage over time
   - Test performance with many open iframes
   - Verify cleanup works as expected
   
4. **Mobile Responsiveness**
   - Test on various viewports
   - Verify touch interactions work for long press
   - Test menu collapse/expand on mobile

5. **Accessibility**
   - Test keyboard navigation
   - Verify screen reader compatibility
   - Test focus management

## Performance Testing

### Metrics to Monitor
- Iframe load time
- Memory usage with multiple iframes
- CPU usage during state transitions
- Frame rate during animations
- Idle timeout effectiveness

### Test Cases
- Load testing with many iframes
- Stress testing with rapid iframe changes
- Long-running tests for memory leak detection
- Measure performance impact of content caching 
