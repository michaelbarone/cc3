# IFrame State Management

## Overview
The IFrame state management system provides a centralized way to manage the lifecycle, visibility, and error states of iframes in the application. It uses React's Context API and custom hooks to provide a simple and type-safe interface for managing iframe states with a focus on the TOP menu navigation experience. The system employs direct DOM manipulation for performance optimization while maintaining React state for component rendering.

## Key Features
- Centralized state management for iframe content
- Type-safe interfaces with React Context API
- Error handling and retry logic
- Visibility control via CSS for state preservation
- Lifecycle management (load, unload, reload)
- Performance optimizations with React.memo and direct DOM manipulation
- Visual state indicators for URL items in the Top Menu navigation
- Long-press handling for resource management
- Support for localhost URLs with custom ports and paths
- Mobile/desktop URL handling with responsive design

## Core Components

### State Structure
```typescript
interface IframeState {
  urls: Record<string, IframeUrl>;
  activeUrlId: string | null;
  initialUrlId: string | null;
}

// Core iframe state types
interface IframeUrl {
  id: string;
  url: string;
  urlMobile: string | null;
  isLocalhost: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePath?: string | null;
  localhostMobilePort?: string | null;
  isLoaded: boolean;
  isVisible: boolean;
  error: string | null;
  retryCount: number;
}
```

### Actions
```typescript
type IframeAction =
  | { type: "INIT_URLS"; payload: { urlGroups: UrlGroup[]; initialUrlId: string } }
  | { type: "SELECT_URL"; payload: { urlId: string } }
  | { type: "LOAD_URL"; payload: { urlId: string } }
  | { type: "UNLOAD_URL"; payload: { urlId: string } }
  | { type: "SET_ERROR"; payload: { urlId: string; error: string | null } };
```

## Usage

### Basic Usage
```typescript
import { useUrlManager, useIframeLifecycle } from "@/app/lib/hooks/useIframe";
import { useIframeManager } from "@/app/lib/hooks/useIframeManager";

function MyComponent({ urlGroups }) {
  const { 
    activeUrlId, 
    urls, 
    selectUrl, 
    unloadUrl,
    initializeUrls,
    loadedUrlIds,
    currentGroup
  } = useUrlManager(urlGroups);
  
  // Select a URL
  const handleSelect = (urlId: string) => {
    selectUrl(urlId);
  };
  
  // Unload a URL
  const handleUnload = (urlId: string) => {
    unloadUrl(urlId);
  };
}

// For a specific iframe
function IframeComponent({ urlId }) {
  const { 
    isLoaded, 
    isVisible, 
    isActive, 
    error, 
    retryCount,
    handleLoad,
    handleError,
    clearError
  } = useIframeLifecycle(urlId);
  
  // Handle iframe events
  const onLoad = () => {
    handleLoad();
  };
  
  const onError = () => {
    handleError("Failed to load iframe");
  };
}

// For more advanced iframe management
function IframeManager({ urlGroups }) {
  const {
    activeUrlId,
    activeUrl,
    loadedUrlIds,
    knownUrlIds,
    handleUrlClick,
    resetIframe,
    unloadIframe,
    reloadIframe,
    handleIframeLoad,
    handleIframeError,
    setIframeRef,
    findUrlById
  } = useIframeManager(urlGroups);
}
```

## URL States and Visual Indicators

The iframe state management system defines four specific states for URL menu items:

1. **Active-Loaded**: 
   - Visual: Active button + green dot
   - State: Visible iframe with loaded content
   - User can click to reload content

2. **Active-Unloaded**: 
   - Visual: Active button, no green dot
   - State: Visible iframe, no content loaded
   - Shows "Content Unloaded" message with reload button

3. **Inactive-Loaded**: 
   - Visual: Normal button + green dot
   - State: Hidden iframe with cached content
   - Content is preserved but not visible

4. **Inactive-Unloaded**: 
   - Visual: Normal button, no green dot
   - State: Hidden iframe, no content
   - Default state for URLs on initial load

### State Transitions

```
┌────────────────────┐     Click      ┌────────────────────┐
│ Inactive-Unloaded  │────────────────▶│   Active-Loaded   │
└────────────────────┘                 └────────────────────┘
         ▲                                      │
         │                                      │
    Long Press                              Long Press
         │                                      │
         │                                      ▼
┌────────────────────┐     Click      ┌────────────────────┐
│  Inactive-Loaded   │────────────────▶│  Active-Unloaded  │
└────────────────────┘                 └────────────────────┘
```

## Top Menu Integration

### Visual State Indicators
The iframe state management system provides essential state data for TOP menu URL items:

1. **Unloaded URLs**: Displayed with opacity 0.5
2. **Loaded URLs**: Displayed with opacity 1.0 and green dot indicator
3. **Active URL**: Displayed with opacity 1.0, green dot (if loaded), and a blue underline

These visual indicators are consistent in both normal and expanded states of the TOP menu.

### Hover-to-Expand Menu Integration
The state system works seamlessly with the hover-to-expand menu pattern as specified in the design document:

```typescript
function TopMenuNavigation({ urlGroups }) {
  const { activeUrlId, urls, selectUrl } = useUrlManager(urlGroups);
  const [expanded, setExpanded] = useState(false);
  
  // In normal state, show only the current group
  const currentGroup = useMemo(() => {
    return urlGroups.find(group => 
      group.urls.some(url => url.id === activeUrlId)
    ) || urlGroups[0];
  }, [urlGroups, activeUrlId]);
  
  // Render URL with appropriate visual state
  const renderUrl = (url) => {
    const isLoaded = urls[url.id]?.isLoaded;
    const isActive = url.id === activeUrlId;
    
    return (
      <UrlItem
        key={url.id}
        url={url}
        isLoaded={isLoaded}
        isActive={isActive}
        onClick={() => selectUrl(url.id)}
        onLongPress={() => unloadUrl(url.id)}
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
   - Visual state updates to active-loaded (opacity 1.0 + blue underline + green dot)
   - Any "Content Unloaded" message is cleared

2. If URL is already active and loaded:
   - The iframe content is reloaded
   - Loading indicators appear
   - URL remains in active-loaded state

### Long-Press Behavior
Long-pressing (2 seconds) on a URL item:

1. Visual feedback:
   - Orange progress bar (2-3px thick) animates along bottom edge of URL item
   - Animation starts after 0.3s delay
   - Optional tooltip shows "Hold for 2s to unload"
   - Haptic feedback on mobile devices via navigator.vibrate API

2. On successful 2s press:
   - URL content is unloaded (iframe's `src` set to empty string)
   - URL item visual state changes to unloaded (opacity 0.5, no green dot)
   - If URL was active, the iframe area shows "Content Unloaded" message with a "Reload Content" button

3. Cancellation:
   - Release before 2s or move pointer away: long-press cancelled
   - Progress indicator resets
   - No action triggered

## Iframe Display and Global Container Management

The system maintains multiple mounted iframes with the following characteristics:

1. **Global Container Approach**:
   - A singleton container element is created outside of React's control
   - Iframes are managed directly in the DOM for performance optimization
   - Container position is updated based on menu position (top or side)
   - Responsive design adjusts for mobile and desktop views

2. **State Preservation**:
   - All iframes remain mounted in the DOM once loaded
   - Inactive iframes use CSS `visibility: hidden` and `position: absolute; left: -9999px`
   - Active iframe uses `visibility: visible`
   - This approach preserves iframe state (scroll position, form inputs, etc.)

3. **Resource Management**:
   - `src`/`data-src` pattern: Initially `data-src` holds the URL, `src` is empty
   - When activated, `src` is set from `data-src` to load content
   - Manual unload (long-press) sets `src=""` but keeps the iframe mounted

4. **Security**:
   - All iframes have appropriate sandbox attributes:
   ```html
   <iframe 
     sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox allow-modals allow-presentation allow-top-navigation-by-user-activation"
     allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
     referrerPolicy="no-referrer-when-downgrade"
     src={srcToRender}
     data-src={dataSrc}
   />
   ```
   - These permissions allow necessary functionality while blocking top navigation

## Localhost URL Support

The system includes support for localhost URLs with custom ports and paths:

1. **Configuration Options**:
   - `isLocalhost`: Boolean flag indicating if URL should use localhost
   - `port`: Custom port for localhost URL
   - `path`: Custom path for localhost URL
   - `localhostMobilePort`: Mobile-specific port for localhost
   - `localhostMobilePath`: Mobile-specific path for localhost

2. **URL Generation**:
   ```typescript
   // Example of how effective URLs are generated
   function getEffectiveUrl(url: UrlWithLocalhost, isMobile: boolean): string {
     if (url.isLocalhost) {
       const protocol = window.location.protocol;
       const hostname = window.location.hostname;
       
       // Determine if we should use mobile-specific values
       const useMobile = isMobile && (url.localhostMobilePort || url.localhostMobilePath);
       
       // Select port and path based on device
       const effectivePort = useMobile && url.localhostMobilePort 
         ? url.localhostMobilePort 
         : url.port || "";
         
       const effectivePath = useMobile && url.localhostMobilePath 
         ? url.localhostMobilePath 
         : url.path || "/";
       
       // Build URL with appropriate parts
       return effectivePort
         ? `${protocol}//${hostname}:${effectivePort}${effectivePath}`
         : `${protocol}//${hostname}${effectivePath}`;
     } else {
       // Use standard URL selection logic for non-localhost URLs
       return isMobile && url.urlMobile ? url.urlMobile : url.url;
     }
   }
   ```

## Error Handling
The system includes built-in error handling:
- Automatic retry tracking
- Error state management
- Clear errors on re-selection
- Integration with notification system

## Performance Considerations
- Global container with direct DOM manipulation for optimal performance
- Iframes remain mounted once loaded
- Visibility controlled via CSS
- State updates are batched
- Selective re-rendering optimization with React.memo
- Event listener cleanup in useEffect returns
- Memoized selectors to minimize rerenders

## Best Practices
1. Always use provided hooks instead of direct context access
2. Use the useIframeManager hook for advanced iframe control
3. Implement proper cleanup in component unmount
4. Handle mobile and desktop URLs appropriately
5. Use long-press for resource management
6. Follow the four-state model for URL items
7. Ensure proper error handling

## User Flow & Interaction

The Top Menu URL selection flow follows this sequence:

1. **Normal State**: Shows current group name and its URLs with appropriate visual indicators
2. **Hover**: Expands to show all groups and their URLs
3. **URL Selection**: 
   - Updates active URL
   - Loads content if needed
   - Makes corresponding iframe visible
   - Updates visual indicators
   - Collapses expanded view
4. **Mouse Away**: Collapses expanded view without changing state

## Dependencies
- React 18+
- Next.js App Router
- TypeScript 5+
- Material UI v6
