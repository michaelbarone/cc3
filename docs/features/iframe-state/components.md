# IFrame State Components

## IframeContainer

The main component responsible for rendering and managing iframes based on the state management system. It uses a global container approach with direct DOM manipulation for performance optimization.

### Props
```typescript
interface IframeContainerProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
}

// Ref type for external control
interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}
```

### Usage
```typescript
import IframeContainer from '@/app/components/iframe/IframeContainer';

function Dashboard() {
  const containerRef = useRef<IframeContainerRef>(null);

  const handleResetIframe = (urlId: string) => {
    containerRef.current?.resetIframe(urlId);
  };

  return (
    <IframeContainer
      ref={containerRef}
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
The IframeContainer uses a global container approach with direct DOM manipulation for optimal performance:

```typescript
// Global container management
let globalIframeContainer: HTMLDivElement | null = null;

// Function to get or create the global iframe container
function getGlobalIframeContainer() {
  if (!globalIframeContainer) {
    globalIframeContainer = document.createElement("div");
    globalIframeContainer.id = "global-iframe-container";
    globalIframeContainer.style.position = "fixed";
    globalIframeContainer.style.top = "0";
    globalIframeContainer.style.left = "0";
    globalIframeContainer.style.width = "100%";
    globalIframeContainer.style.height = "100%";
    globalIframeContainer.style.pointerEvents = "none";
    globalIframeContainer.style.zIndex = "1000";

    if (document.body) {
      document.body.appendChild(globalIframeContainer);
    }
  }
  return globalIframeContainer;
}

// Main container component
const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ urlGroups, initialUrlId, onLoad, onError, onUnload }, ref) {
    const { user } = useAuth();
    const { urls, activeUrlId, initializeUrls, selectUrl, unloadUrl, dispatch } =
      useUrlManager(urlGroups);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery("(max-width:600px)");
    const { preferences } = useUserPreferences();
    
    // Update container position when menu position changes
    useEffect(() => {
      if (preferences?.menuPosition) {
        updateGlobalContainerPosition(preferences.menuPosition);
      }
    }, [preferences?.menuPosition]);

    // Initialize URLs on mount
    useEffect(() => {
      initializeUrls(initialUrlId);
    }, [initializeUrls, initialUrlId]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resetIframe: (urlId: string) => {
          // Implementation details
        },
        unloadIframe: (urlId: string) => {
          // Implementation details
        },
        reloadUnloadedIframe: (urlId: string) => {
          // Implementation details
        },
        getLoadedUrlIds: () => Object.keys(urls).filter((id) => urls[id].isLoaded),
      }),
      [urls, unloadUrl, selectUrl, onUnload, dispatch, onLoad],
    );

    return (
      <Box ref={containerRef} sx={{ width: "100%", height: "100%", position: "relative" }}>
        {/* Render IframeElements for each URL */}
        {Object.keys(urls).map((urlId) => (
          <IframeElement
            key={urlId}
            urlData={urls[urlId]}
            isMobile={isMobile}
            onLoad={onLoad}
            onError={onError}
            containerRef={containerRef}
          />
        ))}
        {/* Render UnloadedContent for active but unloaded URL */}
        {activeUrlId && urls[activeUrlId] && !urls[activeUrlId].isLoaded && (
          <UnloadedContent
            urlId={activeUrlId}
            onReload={(id) => {
              selectUrl(id);
              onLoad?.(id);
            }}
          />
        )}
      </Box>
    );
  },
);
```

## IframeElement

A component that manages an individual iframe and its lifecycle. It creates and manages iframes directly in the DOM for performance optimization.

### Props
```typescript
interface IframeElementProps {
  urlData: IframeUrl;
  isMobile: boolean;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}
```

### Implementation
```typescript
function IframeElement({
  urlData,
  isMobile,
  onLoad,
  onError,
  containerRef,
}: IframeElementProps) {
  const { handleLoad, handleError } = useIframeLifecycle(urlData.id);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Store URL data in a ref to avoid recreating the iframe on URL data changes
  const urlDataRef = useRef(urlData);

  // Create the iframe once on mount
  useEffect(() => {
    const container = getGlobalIframeContainer();
    if (!container || !containerRef.current) return;

    // Check if wrapper already exists for this URL ID
    const existingWrapper = container.querySelector(`[data-iframe-container="${urlData.id}"]`);

    // Create wrapper div if it doesn't exist
    if (!existingWrapper && !wrapperRef.current) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-iframe-container", urlData.id);
      // Set wrapper styles...

      // Create iframe if it doesn't exist
      const iframe = document.createElement("iframe");
      iframe.setAttribute("data-iframe-id", urlData.id);
      const effectiveUrl = getEffectiveUrl(urlData, isMobile);
      iframe.setAttribute("data-src", effectiveUrl);
      // Set iframe attributes and styles...

      // Add event listeners
      const loadHandler = () => {
        if (iframe.src && iframe.src !== "about:blank") {
          handleLoad();
          onLoad?.(urlData.id);
        }
      };

      const errorHandler = () => {
        const errorMsg = "Failed to load content";
        handleError(errorMsg);
        onError?.(urlData.id, errorMsg);
      };

      iframe.addEventListener("load", loadHandler);
      iframe.addEventListener("error", errorHandler);

      // Add to DOM
      wrapper.appendChild(iframe);
      container.appendChild(wrapper);

      // Store refs
      iframeRef.current = iframe;
      wrapperRef.current = wrapper;

      // Return cleanup function
      return () => {
        iframe.removeEventListener("load", loadHandler);
        iframe.removeEventListener("error", errorHandler);
      };
    }
    // Additional implementation details...
  }, []); // Empty dependency array to ensure it only runs once on mount

  // Handle visibility changes separately
  useEffect(() => {
    if (!wrapperRef.current || !iframeRef.current) return;

    // Update visibility
    wrapperRef.current.style.visibility = urlData.isVisible ? "visible" : "hidden";
    wrapperRef.current.style.display = urlData.isVisible ? "block" : "none";
    wrapperRef.current.style.zIndex = urlData.isVisible ? "1" : "0";

    // Load URL only when visible and not already loaded
    if (urlData.isVisible) {
      const effectiveUrl = getEffectiveUrl(urlData, isMobile);
      const currentSrc = iframeRef.current?.getAttribute("src") || undefined;

      // Only set src if it's empty or about:blank
      if (!currentSrc || currentSrc === "about:blank") {
        iframeRef.current.src = effectiveUrl;
      }
    }

    // Update the ref
    urlDataRef.current = urlData;
  }, [
    urlData.isVisible,
    urlData.url,
    urlData.urlMobile,
    urlData.isLocalhost,
    urlData.port,
    urlData.path,
    urlData.localhostMobilePort,
    urlData.localhostMobilePath,
    handleLoad,
    onLoad,
    urlData.id,
  ]);

  return null; // This component only manages the imperative iframe
}
```

## TopMenuNavigation

Component for implementing the hover-to-expand menu pattern in the top navigation area with visual indicators for URL states.

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
This component implements the hover-to-expand design pattern with URL state indicators:

```typescript
function TopMenuNavigation({ urlGroups, initialUrlId, onUrlSelect }: TopMenuNavigationProps) {
  const { activeUrlId, urls, selectUrl, unloadUrl } = useUrlManager(urlGroups);
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
  
  // Handle long press for URL unloading
  const handleLongPress = useCallback((urlId: string) => {
    unloadUrl(urlId);
  }, [unloadUrl]);
  
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
              isLoaded={urls[url.id]?.isLoaded}
              onClick={() => handleUrlClick(url.id)}
              onLongPress={() => handleLongPress(url.id)}
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
                    isLoaded={urls[url.id]?.isLoaded}
                    onClick={() => handleUrlClick(url.id)}
                    onLongPress={() => handleLongPress(url.id)}
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

## UrlMenuItem

Component that represents a URL item in the menu with visual indicators for its state.

### Props
```typescript
interface UrlMenuItemProps {
  url: Url;
  isActive: boolean;
  isLoaded: boolean;
  onClick: () => void;
  onLongPress: () => void;
}
```

### Implementation
```typescript
function UrlMenuItem({ url, isActive, isLoaded, onClick, onLongPress }: UrlMenuItemProps) {
  // Use the long press hook for unload functionality
  const { handleMouseDown, handleMouseUp, handleMouseLeave, progress } = useLongPress({
    onLongPress,
    duration: 2000,
    delayStart: 300,
  });

  // Determine the visual state
  const getUrlStatus = (): 'active-loaded' | 'active-unloaded' | 'inactive-loaded' | 'inactive-unloaded' => {
    if (isActive) {
      return isLoaded ? 'active-loaded' : 'active-unloaded';
    } else {
      return isLoaded ? 'inactive-loaded' : 'inactive-unloaded';
    }
  };

  const urlStatus = getUrlStatus();
  
  return (
    <div
      className={`url-menu-item ${urlStatus}`}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchCancel={handleMouseLeave}
    >
      {url.title || url.url}
      
      {/* Green dot indicator for loaded state */}
      {isLoaded && (
        <div className="loaded-indicator" />
      )}
      
      {/* Long press progress indicator */}
      {progress > 0 && (
        <LongPressProgress progress={progress} />
      )}
    </div>
  );
}
```

## LongPressProgress

Component that displays the progress of a long press action.

### Props
```typescript
interface LongPressProgressProps {
  progress: number;
}
```

### Implementation
```typescript
function LongPressProgress({ progress }: LongPressProgressProps) {
  return (
    <div className="long-press-progress-container">
      <div 
        className="long-press-progress-bar" 
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
```

## UnloadedContent

Component that displays when an active URL is unloaded.

### Props
```typescript
interface UnloadedContentProps {
  urlId: string;
  onReload: (urlId: string) => void;
}
```

### Implementation
```typescript
function UnloadedContent({ urlId, onReload }: UnloadedContentProps) {
  return (
    <div className="unloaded-content">
      <Typography>Content Unloaded</Typography>
      <Button 
        variant="outlined" 
        startIcon={<RefreshIcon />}
        onClick={() => onReload(urlId)}
      >
        Reload Content
      </Button>
    </div>
  );
}
```

## AdminEmptyState

Component that displays when there are no URLs configured in the system and the user is an admin.

### Implementation
```typescript
function AdminEmptyState() {
  return (
    <div className="admin-empty-state">
      <Typography variant="h5">No URLs Configured</Typography>
      <Typography>
        As an administrator, you can add URLs to the system in the Admin area.
      </Typography>
      <Button 
        variant="contained" 
        component={Link}
        href="/admin/urls"
      >
        Add URLs
      </Button>
    </div>
  );
}
```

## Hooks

### useUrlManager

Hook for managing URL selection, loading, and unloading.

```typescript
function useUrlManager(urlGroups: UrlGroup[], initialUrlId?: string) {
  const { state, dispatch } = useIframeState();

  // Initialize URLs in state
  const initializeUrls = useCallback((initialId?: string) => {
    dispatch({
      type: "INIT_URLS",
      payload: {
        urlGroups,
        initialUrlId: initialId || initialUrlId || urlGroups[0]?.urls[0]?.id || "",
      },
    });
  }, [dispatch, urlGroups, initialUrlId]);

  // Select and make a URL visible
  const selectUrl = useCallback((urlId: string) => {
    dispatch({ type: "SELECT_URL", payload: { urlId } });
  }, [dispatch]);

  // Unload a URL's content
  const unloadUrl = useCallback((urlId: string) => {
    dispatch({ type: "UNLOAD_URL", payload: { urlId } });
  }, [dispatch]);

  // Get all loaded URL IDs
  const loadedUrlIds = useMemo(() => {
    return Object.entries(state.urls)
      .filter(([_, urlState]) => urlState.isLoaded)
      .map(([id]) => id);
  }, [state.urls]);

  // Find current group based on active URL
  const currentGroup = useMemo(() => {
    if (!state.activeUrlId) return urlGroups[0] || null;
    return urlGroups.find((group) => 
      group.urls.some((url) => url.id === state.activeUrlId)
    ) || null;
  }, [urlGroups, state.activeUrlId]);

  return {
    activeUrlId: state.activeUrlId,
    initialUrlId: state.initialUrlId,
    urls: state.urls,
    loadedUrlIds,
    currentGroup,
    initializeUrls,
    selectUrl,
    unloadUrl,
    dispatch,
  };
}
```

### useIframeLifecycle

Hook for managing lifecycle of a specific iframe.

```typescript
function useIframeLifecycle(urlId: string) {
  const { state, dispatch } = useIframeState();
  const urlState = state.urls[urlId];

  // Mark URL as loaded
  const handleLoad = useCallback(() => {
    dispatch({ type: "LOAD_URL", payload: { urlId } });
  }, [dispatch, urlId]);

  // Set error state for URL
  const handleError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", payload: { urlId, error } });
  }, [dispatch, urlId]);

  // Clear error state
  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: { urlId, error: null } });
  }, [dispatch, urlId]);

  // Check if URL is active
  const isActive = state.activeUrlId === urlId;

  return {
    isLoaded: urlState?.isLoaded ?? false,
    isVisible: urlState?.isVisible ?? false,
    isActive,
    error: urlState?.error ?? null,
    retryCount: urlState?.retryCount ?? 0,
    handleLoad,
    handleError,
    clearError,
  };
}
```

### useIframeManager

Hook for advanced iframe management including DOM operations.

```typescript
function useIframeManager(urlGroups: UrlGroup[] = []) {
  // Get state methods from hooks
  const { activeUrlId, urls, selectUrl, unloadUrl, initializeUrls } = useUrlManager(urlGroups);

  // Refs for iframes
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // Derived state
  const activeUrl = activeUrlId ? urls[activeUrlId] : null;
  const loadedUrlIds = Object.keys(urls).filter((id) => urls[id].isLoaded);
  const knownUrlIds = Object.keys(urls);

  // Initialize URLs on mount
  useEffect(() => {
    initializeUrls(urlGroups[0]?.urls[0]?.id || "");
  }, [urlGroups, initializeUrls]);

  // Find a URL by ID across all URL groups
  const findUrlById = useCallback((urlId: string): Url | null => {
    for (const group of urlGroups) {
      const url = group.urls.find((u) => u.id === urlId);
      if (url) {
        return url;
      }
    }
    return null;
  }, [urlGroups]);

  // Handle URL click
  const handleUrlClick = useCallback((url: Url) => {
    const isActive = url.id === activeUrlId;
    const isLoaded = loadedUrlIds.includes(url.id);

    if (isActive) {
      if (!isLoaded) {
        // Active but not loaded - reload it
        reloadIframe(url.id);
      } else {
        // Active and loaded - reload (refresh content)
        resetIframe(url.id);
      }
    } else {
      // Not active - make it active
      selectUrl(url.id);
    }
  }, [activeUrlId, loadedUrlIds, selectUrl]);

  // Additional methods for iframe management...

  return {
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
    findUrlById,
  };
}
```

### useLongPress

Hook for long-press gesture handling.

```typescript
function useLongPress({
  onLongPress,
  duration = 2000,
  delayStart = 300,
}: {
  onLongPress: () => void;
  duration?: number;
  delayStart?: number;
}) {
  const [progress, setProgress] = useState<number>(0);

  const handlers = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startTime = 0;
    let animationFrame: number | null = null;

    // Start long press
    const handleMouseDown = () => {
      startTime = Date.now() + delayStart;

      // Clear any existing timers
      if (timer) clearTimeout(timer);
      if (animationFrame) cancelAnimationFrame(animationFrame);

      // Start progress tracking
      const updateProgress = () => {
        const now = Date.now();
        if (now < startTime) {
          setProgress(0);
          animationFrame = requestAnimationFrame(updateProgress);
          return;
        }

        const elapsed = now - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);

        if (newProgress < 1) {
          animationFrame = requestAnimationFrame(updateProgress);
        } else {
          // Execute long press action
          onLongPress();
          
          // Provide haptic feedback on mobile devices
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        }
      };

      animationFrame = requestAnimationFrame(updateProgress);
    };

    // Cancel long press
    const handleCancel = () => {
      if (timer) clearTimeout(timer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      setProgress(0);
    };

    return {
      handleMouseDown,
      handleMouseUp: handleCancel,
      handleMouseLeave: handleCancel,
    };
  }, [onLongPress, duration, delayStart, setProgress]);

  return {
    ...handlers,
    progress,
  };
}
```
