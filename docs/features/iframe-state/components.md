# IFrame State Components

## IframeContainer

The main component responsible for rendering and managing iframes.

### Props
```typescript
interface IframeContainerProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
}
```

### Usage
```typescript
import { IframeContainer } from '@/app/components/iframe/IframeContainer';

function Dashboard() {
  return (
    <IframeContainer
      urlGroups={urlGroups}
      initialUrlId="default-url"
      onLoad={handleLoad}
      onError={handleError}
      onUnload={handleUnload}
    />
  );
}
```

### External Control
The component exposes a ref for external control:

```typescript
interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

// Usage
const iframeRef = useRef<IframeContainerRef>(null);

// Reset an iframe
iframeRef.current?.resetIframe('url-id');
```

## UrlMenu

Component for displaying and managing URL selection.

### Props
```typescript
interface UrlMenuProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
}
```

### Usage
```typescript
import { UrlMenu } from '@/app/components/url-menu/UrlMenu';

function Sidebar() {
  return (
    <UrlMenu
      urlGroups={urlGroups}
      initialUrlId="default-url"
      onUrlSelect={handleUrlSelect}
    />
  );
}
```

### Features
- Group-based organization
- Search functionality
- Keyboard navigation
- Long-press for unload
- Visual feedback for states

## UrlMenuItem

Individual URL item component with state indicators.

### Props
```typescript
interface UrlMenuItemProps {
  url: {
    id: string;
    url: string;
    urlMobile: string | null;
  };
  isActive: boolean;
  isLoaded: boolean;
  hasError: boolean;
  onSelect: (urlId: string) => void;
  onUnload: (urlId: string) => void;
}
```

### Usage
```typescript
import { UrlMenuItem } from '@/app/components/url-menu/UrlMenuItem';

function CustomUrlList() {
  return (
    <UrlMenuItem
      url={urlData}
      isActive={isActive}
      isLoaded={isLoaded}
      hasError={hasError}
      onSelect={handleSelect}
      onUnload={handleUnload}
    />
  );
}
```

## State Integration

### Provider Setup
```typescript
import { IframeProvider } from '@/app/lib/state/iframe-state';

function App() {
  return (
    <IframeProvider>
      <Dashboard />
    </IframeProvider>
  );
}
```

### Hook Usage in Components
```typescript
function CustomComponent() {
  const { urls, activeUrlId, selectUrl, unloadUrl } = useUrlManager(urlGroups);
  const { isLoaded, isVisible, error, handleLoad, handleError } = useIframeLifecycle(urlId);

  // Component logic
}
```

## Error Handling

### Error Boundary
```typescript
import { IframeErrorBoundary } from '@/app/components/iframe/IframeErrorBoundary';

function SafeIframeContainer() {
  return (
    <IframeErrorBoundary fallback={<ErrorFallback />}>
      <IframeContainer urlGroups={urlGroups} />
    </IframeErrorBoundary>
  );
}
```

### Error States
Components handle various error states:
- Loading failures
- Content errors
- Navigation errors
- Security errors

## Performance Optimizations

### Memo Usage
```typescript
const MemoizedUrlMenuItem = memo(UrlMenuItem, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.isLoaded === next.isLoaded &&
    prev.hasError === next.hasError
  );
});
```

### Lazy Loading
```typescript
const LazyIframeContainer = lazy(() => import('./IframeContainer'));

function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyIframeContainer urlGroups={urlGroups} />
    </Suspense>
  );
}
```

## Testing Components

### Unit Tests
```typescript
describe('UrlMenuItem', () => {
  it('should handle selection', () => {
    const onSelect = vi.fn();
    render(
      <UrlMenuItem
        url={mockUrl}
        isActive={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockUrl.id);
  });
});
```

### Integration Tests
```typescript
describe('IframeContainer', () => {
  it('should load initial URL', async () => {
    render(
      <IframeProvider>
        <IframeContainer
          urlGroups={mockUrlGroups}
          initialUrlId="test-url"
        />
      </IframeProvider>
    );

    await screen.findByTestId('iframe-test-url');
    expect(screen.getByTestId('iframe-test-url')).toBeVisible();
  });
});
``` 
