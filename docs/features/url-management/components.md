# URL Management & IFrame Container Components

## Component Overview

The URL management system consists of several interconnected components that handle URL organization, IFrame management, and state synchronization.

## URL Menu Components

### UrlGroup

Purpose: Displays a collapsible group of related URLs.

```typescript
interface UrlGroupProps {
  group: {
    id: string;
    name: string;
    urls: Url[];
  };
  activeUrl: string | null;
  loadedUrls: Set<string>;
  onUrlSelect: (url: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const UrlGroup: React.FC<UrlGroupProps> = ({
  group,
  activeUrl,
  loadedUrls,
  onUrlSelect,
  isExpanded,
  onToggle
}) => {
  // Component implementation
};
```

Key Features:
- Collapsible group header
- URL list management
- Active URL tracking
- Loading state indicators
- Mobile responsiveness

### UrlMenuItem

Purpose: Represents a single URL in the menu with state indicators.

```typescript
interface UrlMenuItemProps {
  url: Url;
  isActive: boolean;
  isLoaded: boolean;
  onSelect: () => void;
  onReset: () => void;
}

const UrlMenuItem: React.FC<UrlMenuItemProps> = ({
  url,
  isActive,
  isLoaded,
  onSelect,
  onReset
}) => {
  // Component implementation
};
```

Key Features:
- State indicators (active/loaded)
- Long press detection
- Progress indicator
- Error state display
- Icon support

## IFrame Components

### IframeContainer

Purpose: Manages the lifecycle and state of multiple IFrames.

```typescript
interface IframeContainerProps {
  urls: Url[];
  activeUrl: string | null;
  onStateChange: (state: IframeState) => void;
  onError: (url: string, error: string) => void;
}

const IframeContainer: React.FC<IframeContainerProps> = ({
  urls,
  activeUrl,
  onStateChange,
  onError
}) => {
  // Component implementation
};
```

Key Features:
- Multiple IFrame management
- State tracking
- Visibility control
- Error handling
- Resource cleanup

### IframeOverlay

Purpose: Displays loading and error states over IFrames.

```typescript
interface IframeOverlayProps {
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
}

const IframeOverlay: React.FC<IframeOverlayProps> = ({
  isLoading,
  error,
  onRetry
}) => {
  // Component implementation
};
```

Key Features:
- Loading spinner
- Error messages
- Retry button
- Transition effects
- Accessibility support

## Custom Hooks

### Iframe Lifecycle Hooks

The Iframe system uses a set of specialized hooks that work together to manage the entire iframe lifecycle. This modular approach allows for better separation of concerns and improved maintainability.

#### useGlobalIframeContainer

Purpose: Creates and manages a global container for iframes outside of React's DOM.

```typescript
function useGlobalIframeContainer(): {
  createIframe: (urlId: string, url: string) => HTMLIFrameElement;
  removeIframe: (urlId: string) => void;
  updateIframeVisibility: (urlId: string, isVisible: boolean) => void;
  updateContainerPosition: (rect: DOMRect) => void;
}
```

Key Features:
- Singleton pattern for global container management
- Direct DOM manipulation for performance
- Maintains maps of iframes and wrapper elements
- Handles iframe creation with proper attributes
- Controls visibility and positioning
- Manages cleanup on component unmount

Example Usage:
```typescript
const { createIframe, updateIframeVisibility } = useGlobalIframeContainer();

// Create a new iframe
const iframe = createIframe('url-123', 'https://example.com');

// Update visibility
updateIframeVisibility('url-123', true);
```

#### useIframeLifecycle

Purpose: Manages the loading, unloading, and resetting of iframes.

```typescript
function useIframeLifecycle(
  urlId: string,
  options: {
    onLoad?: (urlId: string) => void;
    onError?: (urlId: string, error: string) => void;
    onUnload?: (urlId: string) => void;
  } = {}
): {
  loadIframe: (urlId: string, url: string) => void;
  unloadIframe: (urlId: string) => void;
  resetIframe: (urlId: string) => void;
}
```

Key Features:
- Handles iframe load and error events
- Maintains references to iframe elements
- Updates state based on lifecycle events
- Manages URL loading and unloading
- Provides methods for content manipulation
- Cleans up event listeners on unmount

State Transitions:
- On load: active-unloaded → active-loaded
- On error: active-unloaded → active-error
- On manual unload (long press): active-loaded → active-unloaded
- On unload: active-loaded → inactive-unloaded
- On reset: any → inactive-unloaded

Example Usage:
```typescript
const { loadIframe, resetIframe } = useIframeLifecycle('url-123', {
  onLoad: (urlId) => console.log(`Loaded: ${urlId}`),
  onError: (urlId, error) => console.error(`Error loading ${urlId}: ${error}`),
});

// Load content
loadIframe('url-123', 'https://example.com');

// Reset on issue
resetIframe('url-123');
```

#### useIframeVisibility

Purpose: Controls iframe visibility based on active state while preserving loaded/unloaded state.

```typescript
function useIframeVisibility({
  urlId: string,
  isActive: boolean
}): {
  showIframe: () => void;
  hideIframe: () => void;
}
```

Key Features:
- Updates iframe visibility without affecting loaded state
- Manages status transitions between active and inactive states
- Preserves content during visibility changes
- Provides manual control methods
- Integrates with iframe state context

State Transitions:
- When activating: inactive-loaded → active-loaded, inactive-unloaded → active-unloaded
- When deactivating: active-loaded → inactive-loaded, active-unloaded → inactive-unloaded

Example Usage:
```typescript
const { showIframe, hideIframe } = useIframeVisibility({
  urlId: 'url-123',
  isActive: true
});

// Manually control visibility
button.onClick = () => hideIframe();
```

### useLongPress

Purpose: Detects long press events for URL management, enabling both iframe unloading and full reset functionality.

```typescript
interface UseLongPressOptions {
  duration?: number;
  onStart?: () => void;
  onFinish: () => void; // Called when long press completes
  onCancel?: () => void;
  actionType?: 'unload' | 'reset'; // Determines whether to unload or reset the iframe
}

function useLongPress({
  duration = 1000,
  onStart,
  onFinish,
  onCancel,
  actionType = 'unload'
}: UseLongPressOptions) {
  // Hook implementation
  return {
    handlers: {
      onMouseDown: () => void;
      onMouseUp: () => void;
      onMouseLeave: () => void;
      onTouchStart: () => void;
      onTouchEnd: () => void;
    };
    progress: number;
  };
}
```

## Usage Examples

### URL Menu Setup

```typescript
function UrlMenu() {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  return (
    <div className="url-menu">
      {groups.map(group => (
        <UrlGroup
          key={group.id}
          group={group}
          activeUrl={activeUrl}
          loadedUrls={loadedUrls}
          onUrlSelect={handleUrlSelect}
          isExpanded={expandedGroups.has(group.id)}
          onToggle={() => handleGroupToggle(group.id)}
        />
      ))}
    </div>
  );
}
```

### IFrame Container Setup

```typescript
function IframeManager() {
  const [iframeStates, setIframeStates] = useState<Map<string, IframeState>>(
    new Map()
  );
  
  return (
    <div className="iframe-container">
      <IframeContainer
        urls={urls}
        activeUrl={activeUrl}
        onStateChange={handleStateChange}
        onError={handleError}
      />
      {activeUrl && (
        <IframeOverlay
          isLoading={isLoading(activeUrl)}
          error={getError(activeUrl)}
          onRetry={() => handleRetry(activeUrl)}
        />
      )}
    </div>
  );
}
```

## Component Relationships

```
UrlMenu
├── UrlGroup[]
│   └── UrlMenuItem[]
│       └── useLongPress
└── useUrlMenu

IframeManager
├── IframeContainer
│   ├── useIframeState
│   └── IframeOverlay
└── useIframeSync
```

## Testing Considerations

1. Component Testing
   - Test state transitions
   - Verify event handling
   - Check accessibility
   - Test responsiveness
   - Validate error states

2. Hook Testing
   - Test state management
   - Verify cleanup
   - Test error handling
   - Check memory leaks
   - Validate timeouts

3. Integration Testing
   - Test component interaction
   - Verify state sync
   - Test error propagation
   - Check performance
   - Validate accessibility

4. E2E Testing
   - Test user flows
   - Verify IFrame loading
   - Test error recovery
   - Check mobile behavior
   - Validate performance 
