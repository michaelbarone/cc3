# IFrame State Management

## Overview
The IFrame state management system provides a centralized way to manage the lifecycle, visibility, and error states of iframes in the application. It uses React's Context API and custom hooks to provide a simple and type-safe interface for managing iframe states.

## Key Features
- Centralized state management
- Type-safe interfaces
- Error handling and retry logic
- Visibility control
- Lifecycle management
- Performance optimizations

## Core Components

### State Structure
```typescript
interface IframeState {
  urls: Record<string, {
    id: string;
    url: string;
    urlMobile: string | null;
    isLoaded: boolean;    // Tracks if iframe has been loaded
    isVisible: boolean;   // Controls visibility
    error: string | null;
    retryCount: number;   // Tracks retry attempts
  }>;
  activeUrlId: string | null;
  initialUrlId: string | null;  // Tracks first URL for initial load
}
```

### Actions
```typescript
type IframeAction =
  | { type: 'INIT_URLS'; payload: { urlGroups: UrlGroup[]; initialUrlId: string } }
  | { type: 'SELECT_URL'; payload: { urlId: string } }
  | { type: 'LOAD_URL'; payload: { urlId: string } }
  | { type: 'UNLOAD_URL'; payload: { urlId: string } }
  | { type: 'SET_ERROR'; payload: { urlId: string; error: string | null } };
```

## Usage

### Basic Usage
```typescript
import { useIframeState } from '@/app/lib/state/iframe-state';

function MyComponent() {
  const { state, dispatch } = useIframeState();
  
  // Initialize URLs
  useEffect(() => {
    dispatch({
      type: 'INIT_URLS',
      payload: { urlGroups, initialUrlId: 'first-url' }
    });
  }, []);

  // Select a URL
  const handleSelect = (urlId: string) => {
    dispatch({ type: 'SELECT_URL', payload: { urlId } });
  };
}
```

### Custom Hooks
The system provides several custom hooks for common use cases:

#### useUrlManager
```typescript
const { activeUrlId, urls, selectUrl, unloadUrl } = useUrlManager(urlGroups);
```

#### useIframeLifecycle
```typescript
const { isLoaded, isVisible, error, handleLoad, handleError } = useIframeLifecycle(urlId);
```

## Error Handling
The system includes built-in error handling:
- Automatic retry tracking
- Error state management
- Clear errors on re-selection
- Integration with notification system

## Performance Considerations
- Iframes remain mounted once loaded
- Visibility controlled via CSS
- State updates are batched
- Selective re-rendering optimization

## Testing
Comprehensive test suite available in `app/lib/state/__tests__/iframe-state.test.tsx`

### Example Test
```typescript
test('should handle URL selection', () => {
  const { result } = renderHook(() => useIframeState(), {
    wrapper: TestWrapper,
  });

  act(() => {
    result.current.dispatch({
      type: 'SELECT_URL',
      payload: { urlId: 'test-url' }
    });
  });

  expect(result.current.state.activeUrlId).toBe('test-url');
});
```

## Best Practices
1. Always use provided hooks instead of direct context access
2. Handle errors appropriately using error boundaries
3. Implement proper cleanup in components
4. Follow the unload pattern for iframe cleanup
5. Use proper TypeScript types for type safety

## Related Components
- IframeContainer
- UrlMenu
- UrlMenuItem

## Dependencies
- React 18+
- Next.js App Router
- TypeScript 5+ 
