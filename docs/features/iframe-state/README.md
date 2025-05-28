# IFrame State Management

## Overview
The IFrame state management system provides a centralized way to manage the lifecycle, visibility, and error states of iframes in the application. It uses React's Context API and custom hooks to provide a simple and type-safe interface for managing iframe states with a focus on the TOP menu navigation experience.

## Key Features
- Centralized state management
- Type-safe interfaces
- Error handling and retry logic
- Visibility control
- Lifecycle management
- Performance optimizations
- Visual state indicators for TOP menu navigation
- Long-press handling for resource management

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

## TOP Menu Integration

### Visual State Indicators
The iframe state management system provides essential state data for TOP menu URL items:

1. **Unloaded URLs**: Displayed with opacity 0.5
2. **Loaded URLs**: Displayed with opacity 1.0
3. **Active URL**: Displayed with opacity 1.0 plus a blue underline

These visual indicators are consistent in both normal and expanded states of the TOP menu.

### Hover-to-Expand Menu Integration
The state system works seamlessly with the hover-to-expand menu pattern:

```typescript
function TopMenuNavigation({ urlGroups }) {
  const { activeUrlId, urls, selectUrl } = useUrlManager(urlGroups);
  const [expanded, setExpanded] = useState(false);
  
  // In normal state, show only the current group
  const currentGroup = useMemo(() => {
    return urlGroups.find(group => 
      group.urls.some(url => url.id === activeUrlId)
    );
  }, [urlGroups, activeUrlId]);
  
  // Render URL with appropriate visual state
  const renderUrl = (url) => {
    const isLoaded = urls[url.id]?.isLoaded || false;
    const isActive = url.id === activeUrlId;
    
    return (
      <UrlItem
        key={url.id}
        url={url}
        style={{
          opacity: isLoaded ? 1.0 : 0.5,
          borderBottom: isActive ? '2px solid blue' : 'none'
        }}
        onClick={() => selectUrl(url.id)}
      />
    );
  };
  
  return (
    <div 
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Normal state: current group name + its URLs */}
      {!expanded && currentGroup && (
        <div className="normal-state">
          <div className="group-name">{currentGroup.name}</div>
          <div className="url-row">
            {currentGroup.urls.map(renderUrl)}
          </div>
        </div>
      )}
      
      {/* Expanded state: all groups + their URLs */}
      {expanded && (
        <div className="expanded-view">
          {urlGroups.map(group => (
            <div key={group.id} className="group-section">
              <div className="group-name">{group.name}</div>
              <div className="url-row">
                {group.urls.map(renderUrl)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Click and Long-Press Interaction

### Single-Click Behavior
When a user clicks a URL item in the TOP menu:

1. If URL is not active or is unloaded:
   - The URL is activated and loaded
   - Visual state updates to active (opacity 1.0 + blue underline)
   - Any "Content Unloaded" message is cleared

2. If URL is already active and loaded:
   - The iframe content is reloaded
   - Loading indicators appear
   - URL remains in active state

### Long-Press Behavior
Long-pressing (2 seconds) on a URL item:

1. Visual feedback:
   - Orange progress bar (2-3px thick) animates along bottom edge of URL item
   - Animation starts after 0.3s delay
   - Optional tooltip shows "Hold for 2s to unload"

2. On successful 2s press:
   - URL content is unloaded (iframe's `src` set to empty string)
   - URL item visual state changes to unloaded (opacity 0.5)
   - If URL was active, the iframe area shows "Content Unloaded" message with a "Reload Content" button

3. Cancellation:
   - Release before 2s or move pointer away: long-press cancelled
   - Progress indicator resets
   - No action triggered

## Iframe Security

All iframes are rendered with the following sandbox attributes for security:

```html
<iframe 
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
  src={srcToRender}
  data-src={dataSrc}
/>
```

These permissions allow for:
- Script execution within the iframe (`allow-scripts`)
- Same-origin requests (`allow-same-origin`)
- Opening popups (`allow-popups`)
- Form submission (`allow-forms`)
- File downloads (`allow-downloads`)
- Popups to escape sandbox restrictions (`allow-popups-to-escape-sandbox`)

While still blocking top navigation - this ensures any navigation attempts open in a new tab instead.

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
6. Ensure visual state indicators are consistent between normal and expanded TOP menu views

## Related Components
- IframeContainer
- UrlMenu
- TopMenuNavigation
- UrlMenuItem

## Dependencies
- React 18+
- Next.js App Router
- TypeScript 5+
