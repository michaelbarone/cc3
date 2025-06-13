# IFrame State Components

## IframeContainer

The main component responsible for rendering and managing iframes based on the state management system.

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

### Implementation Details
The IframeContainer uses the IframeProvider context to manage multiple iframes:

```typescript
function IframeContainer({ urlGroups, initialUrlId }) {
  const { 
    getAllManagedIframesForRender,
    markAsLoaded,
    activeUrlIdentifier
  } = useIframeManager();

  // Get all iframes that need to be rendered
  const iframesForRender = getAllManagedIframesForRender();
  
  return (
    <div className="iframe-container">
      {/* Loading indicator for active iframe if not loaded */}
      {activeUrlIdentifier && !isUrlLoaded(activeUrlIdentifier) && (
        <div className="loading-indicator">
          <CircularProgress />
        </div>
      )}
      
      {/* "Content Unloaded" message for active iframe that's been unloaded */}
      {activeUrlIdentifier && isActiveUrlUnloaded() && (
        <div className="content-unloaded-message">
          <Typography>Content Unloaded</Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => reloadUnloadedIframe(activeUrlIdentifier)}
          >
            Reload Content
          </Button>
        </div>
      )}
      
      {/* Render all iframes */}
      {iframesForRender.map(iframe => (
        <iframe
          key={iframe.identifier}
          src={iframe.srcToRender}
          data-src={iframe.dataSrc}
          style={{
            visibility: iframe.isActive ? 'visible' : 'hidden',
            position: iframe.isActive ? 'relative' : 'absolute',
            left: iframe.isActive ? 0 : '-9999px'
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
          onLoad={() => {
            if (iframe.srcToRender && iframe.srcToRender !== '') {
              markAsLoaded(iframe.identifier);
            }
          }}
        />
      ))}
    </div>
  );
}
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
This component implements the hover-to-expand design pattern detailed in the design document:

```typescript
function TopMenuNavigation({ urlGroups, initialUrlId, onUrlSelect }: TopMenuNavigationProps) {
  const { activeUrlIdentifier, isUrlLoaded, setActiveUrl } = useIframeManager();
  const [expanded, setExpanded] = useState(false);
  
  // Find current group based on active URL
  const currentGroup = useMemo(() => {
    return urlGroups.find(group => 
      group.urls.some(url => url.id === activeUrlIdentifier)
    ) || urlGroups[0];
  }, [urlGroups, activeUrlIdentifier]);

  // Handle URL selection
  const handleUrlClick = useCallback((urlId: string, originalUrl: string) => {
    setActiveUrl(urlId, originalUrl);
    if (onUrlSelect) onUrlSelect(urlId);
    setExpanded(false);
  }, [setActiveUrl, onUrlSelect]);
  
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
              isActive={url.id === activeUrlIdentifier}
              isLoaded={isUrlLoaded(url.id)}
              onSelect={handleUrlClick}
              onUnload={markUrlAsUnloaded}
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
                    isActive={url.id === activeUrlIdentifier}
                    isLoaded={isUrlLoaded(url.id)}
                    onSelect={handleUrlClick}
                    onUnload={markUrlAsUnloaded}
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

### Tablet Responsiveness
For tablet viewport sizes (768px - 1199px):

```typescript
function TopMenuNavigationTablet({ urlGroups }) {
  const [expanded, setExpanded] = useState(false);
  
  // Same implementation as above but with modifications:
  return (
    <div className="top-menu-navigation tablet">
      {/* Normal State - Modified for tablet */}
      <div className="normal-state">
        <div className="group-name">{currentGroup.name}</div>
        <div className="url-row-scrollable">
          {currentGroup.urls.slice(0, visibleItemCount).map(/* render URLs */)}
          {currentGroup.urls.length > visibleItemCount && (
            <button 
              className="more-button"
              onClick={(e) => {
                e.stopPropagation();
                setOverflowMenuOpen(true);
              }}
            >
              •••
            </button>
          )}
        </div>
      </div>
      
      {/* Overflow menu for tablet */}
      {overflowMenuOpen && (
        <Menu
          anchorEl={moreButtonRef.current}
          open={overflowMenuOpen}
          onClose={() => setOverflowMenuOpen(false)}
        >
          {currentGroup.urls.slice(visibleItemCount).map(url => (
            <MenuItem 
              key={url.id}
              onClick={() => handleUrlClick(url.id, url.originalUrl)}
            >
              {/* URL item content */}
            </MenuItem>
          ))}
        </Menu>
      )}
      
      {/* Expanded View - Similar to desktop but optimized for touch */}
    </div>
  );
}
```

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
  onSelect: (urlId: string, originalUrl: string) => void;
  onUnload?: (urlId: string) => void;
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
      onClick={() => onSelect(url.id, url.url)}
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

## useLongPress Hook

Custom hook to handle long-press interactions for URL unloading.

### Usage
```typescript
const { 
  handleMouseDown, 
  handleMouseUp, 
  handleMouseLeave, 
  progress 
} = useLongPress({
  onLongPress: () => unloadUrl(urlId),
  duration: 2000,
  delayStart: 300
});
```

### Implementation
```typescript
function useLongPress({
  onLongPress,
  duration = 2000,
  delayStart = 300
}) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const updateProgress = useCallback(() => {
    if (!startTimeRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min(elapsed / duration, 1);
    setProgress(newProgress);
    
    if (newProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      // Complete - trigger callback
      onLongPress();
    }
  }, [duration, onLongPress]);
  
  const handleMouseDown = useCallback(() => {
    // Delay starting the timer
    timerRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }, delayStart);
  }, [delayStart, updateProgress]);
  
  const handleCancel = useCallback(() => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    startTimeRef.current = null;
    setProgress(0);
  }, []);
  
  const handleMouseUp = useCallback(() => {
    handleCancel();
  }, [handleCancel]);
  
  const handleMouseLeave = useCallback(() => {
    handleCancel();
  }, [handleCancel]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);
  
  return {
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    progress
  };
}
```

## Integration Example

### Complete Dashboard with Top Menu and Iframe Container
```typescript
function Dashboard() {
  const [urlGroups, setUrlGroups] = useState([]);
  
  // Fetch URL groups from API
  useEffect(() => {
    async function fetchData() {
      const response = await fetch('/api/dashboard/urlGroups');
      const data = await response.json();
      setUrlGroups(data);
    }
    fetchData();
  }, []);
  
  return (
    <IframeProvider>
      <AppBar>
        <div className="logo">ControlCenter</div>
        <TopMenuNavigation urlGroups={urlGroups} />
        <UserMenu />
      </AppBar>
      <main className="dashboard-content">
        <IframeContainer urlGroups={urlGroups} />
      </main>
    </IframeProvider>
  );
}
```

This architecture implements the user flow detailed in the design document, where users can:
1. View their current group and URLs in the normal state
2. Hover to expand and see all groups
3. Select a URL to activate its iframe
4. Long-press to unload content when needed 
