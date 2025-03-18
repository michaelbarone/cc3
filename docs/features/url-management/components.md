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

### useIframeState

Purpose: Manages IFrame state and lifecycle.

```typescript
interface UseIframeStateOptions {
  url: string;
  timeout?: number;
  retryAttempts?: number;
}

function useIframeState({
  url,
  timeout = 30000,
  retryAttempts = 3
}: UseIframeStateOptions) {
  // Hook implementation
  return {
    isLoaded: boolean;
    isVisible: boolean;
    error: string | null;
    load: () => void;
    unload: () => void;
    retry: () => void;
  };
}
```

### useLongPress

Purpose: Detects long press events for URL reset functionality.

```typescript
interface UseLongPressOptions {
  duration?: number;
  onStart?: () => void;
  onFinish: () => void;
  onCancel?: () => void;
}

function useLongPress({
  duration = 1000,
  onStart,
  onFinish,
  onCancel
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
