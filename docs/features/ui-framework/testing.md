# UI Framework Testing Documentation

## Overview

This document outlines the testing strategy for the UI Framework components, hooks, and utilities. We use a combination of unit tests, integration tests, and end-to-end tests to ensure the reliability and functionality of our UI components.

## Test Environment Setup

### Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@testing-library/jest-dom": "^6.1.5",
    "happy-dom": "^12.10.3",
    "msw": "^2.0.11"
  }
}
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.tsx', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/setup.ts',
      ]
    }
  }
});
```

### Test Setup

```typescript
// test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});
```

### Test Utilities

```typescript
// test/utils/setup/providers.tsx
import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { theme } from '@/app/theme';

export function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
}

export function createMatchMedia(width: number) {
  return (query: string): MediaQueryList => ({
    matches: query.includes(`${width}`),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
}
```

## Component Testing

### Button Component

```typescript
// components/Button/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Button', () => {
  it('renders with correct variant', () => {
    renderWithTheme(
      <Button variant="contained">Click Me</Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-contained');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    renderWithTheme(
      <Button onClick={handleClick}>Click Me</Button>
    );
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('displays loading state', () => {
    renderWithTheme(
      <Button loading>Loading</Button>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### Dialog Component

```typescript
// components/Dialog/Dialog.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Dialog', () => {
  it('renders when open', () => {
    renderWithTheme(
      <Dialog
        open={true}
        onClose={() => {}}
        title="Test Dialog"
      >
        Content
      </Dialog>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
  });

  it('calls onClose when clicking outside', async () => {
    const handleClose = vi.fn();
    renderWithTheme(
      <Dialog
        open={true}
        onClose={handleClose}
        title="Test Dialog"
      >
        Content
      </Dialog>
    );
    
    const backdrop = screen.getByRole('presentation');
    await userEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
```

## Hook Testing

### useTheme Hook

```typescript
// hooks/useTheme.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('provides initial theme mode', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(result.current.mode).toBe('light');
  });

  it('toggles theme mode', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    expect(result.current.mode).toBe('dark');
  });

  it('persists theme mode', () => {
    const { result, rerender } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    act(() => {
      result.current.setMode('dark');
    });
    
    rerender();
    expect(result.current.mode).toBe('dark');
  });
});
```

### useBreakpoints Hook

```typescript
// hooks/useBreakpoints.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreakpoints } from './useBreakpoints';
import { createMatchMedia } from '@/test/utils/setup/providers';

describe('useBreakpoints', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('detects mobile breakpoint', () => {
    window.matchMedia = createMatchMedia(300);
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.breakpoint).toBe('xs');
  });

  it('detects desktop breakpoint', () => {
    window.matchMedia = createMatchMedia(1200);
    const { result } = renderHook(() => useBreakpoints());
    
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe('lg');
  });
});
```

## Integration Testing

### Theme Integration

```typescript
// integration/theme.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Theme Integration', () => {
  it('applies theme to components', () => {
    renderWithTheme(<App />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'rgb(25, 118, 210)' // primary color
    });
  });

  it('persists theme changes across components', async () => {
    renderWithTheme(<App />);
    
    const themeToggle = screen.getByLabelText('toggle theme');
    await userEvent.click(themeToggle);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'rgb(25, 118, 210)' // dark theme primary color
    });
  });
});
```

### Form Integration

```typescript
// integration/form.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Form Integration', () => {
  it('validates form submission', async () => {
    const handleSubmit = vi.fn();
    renderWithTheme(<LoginForm onSubmit={handleSubmit} />);
    
    // Try to submit empty form
    await userEvent.click(screen.getByText('Submit'));
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    
    // Fill form and submit
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByText('Submit'));
    
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

## Performance Testing

### Component Rendering

```typescript
// performance/rendering.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Button } from '@/components/Button';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Component Rendering Performance', () => {
  it('renders button within performance budget', () => {
    const start = performance.now();
    
    renderWithTheme(
      <Button variant="contained">
        Performance Test
      </Button>
    );
    
    const end = performance.now();
    const renderTime = end - start;
    
    expect(renderTime).toBeLessThan(100); // 100ms budget
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Theme Switching Performance

```typescript
// performance/theme.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

describe('Theme Switching Performance', () => {
  it('switches theme within performance budget', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    const start = performance.now();
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    const end = performance.now();
    const switchTime = end - start;
    
    expect(switchTime).toBeLessThan(50); // 50ms budget
    expect(result.current.mode).toBe('dark');
  });
});
```

## Accessibility Testing

### Button Accessibility

```typescript
// accessibility/button.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Button } from '@/components/Button';
import { renderWithTheme } from '@/test/utils/setup/providers';

describe('Button Accessibility', () => {
  it('has sufficient color contrast', () => {
    renderWithTheme(
      <Button variant="contained">
        Accessible Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Check contrast ratio
    expect(styles.backgroundColor).toBe('rgb(25, 118, 210)');
    expect(styles.color).toBe('rgb(255, 255, 255)');
  });

  it('supports keyboard navigation', async () => {
    const handleClick = vi.fn();
    renderWithTheme(
      <Button onClick={handleClick}>
        Keyboard Accessible
      </Button>
    );
    
    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
    
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Coverage Requirements

- Unit Tests: 90% coverage for components and hooks
- Integration Tests: Key user flows and component interactions
- Performance Tests: Critical rendering paths and state updates
- Accessibility Tests: WCAG 2.1 AA compliance

## Best Practices

1. Test Component Behavior
   - Test user interactions
   - Verify state changes
   - Check accessibility attributes
   - Validate error states

2. Test Hook Functionality
   - Test initial state
   - Verify state updates
   - Check cleanup functions
   - Test error handling

3. Test Theme Integration
   - Verify theme application
   - Test theme switching
   - Check responsive behavior
   - Validate color contrast

4. Performance Testing
   - Monitor render times
   - Check re-render frequency
   - Validate memory usage
   - Test load times

5. Accessibility Testing
   - Test keyboard navigation
   - Verify screen reader support
   - Check color contrast
   - Validate ARIA attributes 
