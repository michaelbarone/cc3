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

## TopMenuNavigation

Component for implementing the hover-to-expand menu pattern in the top navigation area.

### Props
```typescript
interface TopMenuNavigationProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
}
```

### Usage
```typescript
import { TopMenuNavigation } from '@/app/components/url-menu/TopMenuNavigation';

function AppBar() {
  return (
    <div className="app-bar">
      <div className="logo">ControlCenter</div>
      <TopMenuNavigation
        urlGroups={urlGroups}
        initialUrlId="default-url"
        onUrlSelect={handleUrlSelect}
      />
      <div className="user-menu">User Menu</div>
    </div>
  );
}
```

### Implementation
```typescript
function TopMenuNavigation({ urlGroups, initialUrlId, onUrlSelect }: TopMenuNavigationProps) {
  const { activeUrlId, urls, selectUrl } = useUrlManager(urlGroups, initialUrlId);
  const [expanded, setExpanded] = useState(false);
  
  // Find current group based on active URL
  const currentGroup = useMemo(() => {
    return urlGroups.find(group => 
      group.urls.some(url => url.id === activeUrlId)
    ) || urlGroups[0];
  }, [urlGroups, activeUrlId]);

  // Handle URL selection
  const handleUrlClick = useCallback((urlId: string) => {
    selectUrl(urlId);
    if (onUrlSelect) onUrlSelect(urlId);
    setExpanded(false);
  }, [selectUrl, onUrlSelect]);
  
  return (
    <div 
      className="top-menu-navigation"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Normal State - Current Group + URLs */}
      <div className="normal-state">
        <div className="group-name">{currentGroup.name}</div>
        <div className="url-row">
          {currentGroup.urls.map(url => (
            <UrlMenuItem
              key={url.id}
              url={url}
              isActive={url.id === activeUrlId}
              isLoaded={urls[url.id]?.isLoaded || false}
              onSelect={handleUrlClick}
              onUnload={(urlId) => {
                // Long press handler
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Expanded View - All Groups + URLs */}
      {expanded && (
        <div className="expanded-view">
          {urlGroups.map(group => (
            <div key={group.id} className="group-section">
              <div className="group-name">{group.name}</div>
              <div className="url-row">
                {group.urls.map(url => (
                  <UrlMenuItem
                    key={url.id}
                    url={url}
                    isActive={url.id === activeUrlId}
                    isLoaded={urls[url.id]?.isLoaded || false}
                    onSelect={handleUrlClick}
                    onUnload={(urlId) => {
                      // Long press handler
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Features
- Hover-to-expand interaction pattern
- Shows current group + URLs in normal state
- Shows all groups + URLs in expanded state
- Visual indicators for URL states (active/loaded/unloaded)
- Tablet responsive with overflow handling

## UrlMenuItem

Individual URL item component with state indicators specifically designed for the TOP menu.

### Props
```typescript
interface UrlMenuItemProps {
  url: {
    id: string;
    url: string;
    urlMobile: string | null;
    title: string;
    faviconUrl?: string;
  };
  isActive: boolean;
  isLoaded: boolean;
  hasError?: boolean;
  onSelect: (urlId: string) => void;
  onUnload?: (urlId: string) => void;
  style?: React.CSSProperties;
}
```

### Usage
```typescript
import { UrlMenuItem } from '@/app/components/url-menu/UrlMenuItem';

function CustomUrlList() {
  // In the context of Top Menu
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

### Implementation
```typescript
const UrlMenuItem = memo(({
  url,
  isActive,
  isLoaded,
  hasError,
  onSelect,
  onUnload
}: UrlMenuItemProps) => {
  // Long press hook for unload gesture
  const { handleMouseDown, handleMouseUp, handleMouseLeave, progress } = useLongPress({
    onLongPress: () => onUnload?.(url.id),
    duration: 2000,
    delayStart: 300
  });
  
  return (
    <div 
      className={`url-menu-item ${isActive ? 'active' : ''}`}
      style={{ 
        opacity: isLoaded ? 1.0 : 0.5,
        borderBottom: isActive ? '2px solid blue' : 'none',
        position: 'relative'
      }}
      onClick={() => onSelect(url.id)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={hasError ? "Error loading content" : url.title}
    >
      {/* Favicon */}
      {url.faviconUrl ? (
        <img 
          src={url.faviconUrl} 
          alt=""
          className="favicon"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="favicon-placeholder"></div>
      )}
      
      {/* Title */}
      <span className="title">{url.title}</span>
      
      {/* Long press progress indicator */}
      {progress > 0 && (
        <div 
          className="progress-indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            width: `${progress * 100}%`,
            backgroundColor: 'orange'
          }}
        />
      )}
      
      {/* Error indicator */}
      {hasError && (
        <div className="error-indicator">!</div>
      )}
    </div>
  );
});
```

## State Integration

### Provider Setup for TOP Menu Integration
```typescript
import { IframeProvider } from '@/app/lib/state/iframe-state';

function App() {
  return (
    <IframeProvider>
      <AppBar>
        <TopMenuNavigation urlGroups={urlGroups} />
      </AppBar>
      <IframeContainer urlGroups={urlGroups} />
    </IframeProvider>
  );
}
```

### Hook Usage in Components
```typescript
function TopMenuWrapper({ urlGroups }) {
  const { urls, activeUrlId, selectUrl, unloadUrl } = useUrlManager(urlGroups);
  const { isLoaded, isVisible, error, handleLoad, handleError } = useIframeLifecycle(activeUrlId);

  // Component logic for TOP menu
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

### Error States in TOP Menu
The TOP menu URL items display different visual states for errors:
- Error icon indicator
- Tooltip showing error message
- Visual styling (can be customized)

## Performance Optimizations

### Memo Usage for TOP Menu Items
```typescript
const MemoizedUrlMenuItem = memo(UrlMenuItem, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.isLoaded === next.isLoaded &&
    prev.hasError === next.hasError
  );
});
```

### TOP Menu Specific Optimizations
```typescript
// Only re-calculate current group when activeUrlId changes
const currentGroup = useMemo(() => {
  return urlGroups.find(group => 
    group.urls.some(url => url.id === activeUrlId)
  );
}, [urlGroups, activeUrlId]);

// Optimize expanded view rendering
const ExpandedView = memo(({ urlGroups, activeUrlId, onSelect }) => {
  // Implementation
});
```

## Testing Components

### Unit Tests for TOP Menu Components
```typescript
describe('TopMenuNavigation', () => {
  it('should display current group in normal state', () => {
    const mockUrlGroups = [
      {
        id: 'group1',
        name: 'Group 1',
        urls: [{ id: 'url1', title: 'URL 1', url: 'https://example.com' }]
      }
    ];
    
    render(
      <IframeProvider initialActiveUrlId="url1">
        <TopMenuNavigation urlGroups={mockUrlGroups} />
      </IframeProvider>
    );
    
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('URL 1')).toBeInTheDocument();
  });
  
  it('should expand on hover', async () => {
    const mockUrlGroups = [
      {
        id: 'group1',
        name: 'Group 1',
        urls: [{ id: 'url1', title: 'URL 1', url: 'https://example.com' }]
      },
      {
        id: 'group2',
        name: 'Group 2',
        urls: [{ id: 'url2', title: 'URL 2', url: 'https://example.org' }]
      }
    ];
    
    render(
      <IframeProvider initialActiveUrlId="url1">
        <TopMenuNavigation urlGroups={mockUrlGroups} />
      </IframeProvider>
    );
    
    // Initially only Group 1 is visible
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.queryByText('Group 2')).not.toBeInTheDocument();
    
    // Hover to expand
    fireEvent.mouseEnter(screen.getByText('Group 1').closest('.top-menu-navigation'));
    
    // Now both groups should be visible
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Group 2')).toBeInTheDocument();
  });
});
```

### Integration Tests with Iframe Container
```typescript
describe('TOP Menu and IframeContainer Integration', () => {
  it('should activate URL when clicked in TOP menu', async () => {
    const mockUrlGroups = [
      {
        id: 'group1',
        name: 'Group 1',
        urls: [
          { id: 'url1', title: 'URL 1', url: 'https://example.com' },
          { id: 'url2', title: 'URL 2', url: 'https://example.org' }
        ]
      }
    ];
    
    render(
      <IframeProvider>
        <TopMenuNavigation urlGroups={mockUrlGroups} />
        <IframeContainer urlGroups={mockUrlGroups} />
      </IframeProvider>
    );
    
    // Click on URL 2
    fireEvent.click(screen.getByText('URL 2'));
    
    // URL 2 should be active
    expect(screen.getByText('URL 2').closest('.url-menu-item')).toHaveClass('active');
    
    // The iframe for URL 2 should be visible
    await waitFor(() => {
      const iframe = screen.getByTestId('iframe-url2');
      expect(iframe).toBeVisible();
    });
  });
});
``` 
