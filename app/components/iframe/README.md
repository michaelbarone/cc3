# IframeContainer Refactor

This is documentation for the refactored IframeContainer components.

## Components Overview

### Core Components

- **IframeContainer**: Main container that manages iframes outside of React's DOM
- **IframeWrapper**: Handles iframe rendering with proper state management
- **Overlays**: Visual components for various iframe states (loading, error, unloaded)
- **MenuBarAdapter**: Connects the existing MenuBar with our new state system

### Hooks

- **useGlobalIframeContainer**: Creates and manages the global container for iframes
- **useIframeLifecycle**: Handles iframe creation, destruction, and lifecycle
- **useIframeVisibility**: Manages iframe visibility and z-index
- **useIdleTimeout**: Implements idle timeout tracking per URL
- **useIframeEvents**: Handles iframe events like load, error, and cross-origin

## Usage Examples

### Basic Usage

```tsx
import { IframeProvider } from '@/app/components/iframe/state/IframeContext';
import IframeContainer from '@/app/components/iframe/IframeContainerRefactored';

export default function MyPage() {
  const urlGroups = [...]; // Your URL groups
  const activeUrlId = '...'; // Current active URL ID
  const activeUrl = {...}; // Current active URL object
  
  return (
    <IframeProvider activeUrlId={activeUrlId}>
      <IframeContainer
        activeUrlId={activeUrlId}
        activeUrl={activeUrl}
        urlGroups={urlGroups}
        onLoad={(urlId) => console.log(`Iframe loaded: ${urlId}`)}
        onError={(urlId, error) => console.error(`Iframe error: ${urlId}`, error)}
      />
    </IframeProvider>
  );
}
```

### Using MenuBarAdapter

```tsx
import { IframeProvider } from '@/app/components/iframe/state/IframeContext';
import IframeContainer from '@/app/components/iframe/IframeContainerRefactored';
import { MenuBarAdapter } from '@/app/components/iframe/MenuBarAdapter';

export default function DashboardPage() {
  const urlGroups = [...]; // Your URL groups
  const activeUrlId = '...'; // Current active URL ID
  const activeUrl = {...}; // Current active URL object
  
  return (
    <IframeProvider activeUrlId={activeUrlId}>
      <div className="layout">
        <div className="sidebar">
          <MenuBarAdapter 
            urlGroups={urlGroups} 
            menuPosition="side" 
          />
        </div>
        <div className="content">
          <IframeContainer
            activeUrlId={activeUrlId}
            activeUrl={activeUrl}
            urlGroups={urlGroups}
            onLoad={(urlId) => console.log(`Iframe loaded: ${urlId}`)}
            onError={(urlId, error) => console.error(`Iframe error: ${urlId}`, error)}
          />
        </div>
      </div>
    </IframeProvider>
  );
}
```

### State Transition Diagram

The iframes can be in one of four states:

1. **active-loaded**: Currently visible with content loaded
2. **active-unloaded**: Currently visible but content not loaded
3. **inactive-loaded**: Not visible but content is cached
4. **inactive-unloaded**: Not visible and no content loaded

Transitions:
- **active-loaded** ↔ **active-unloaded**: User unloads/reloads content
- **active-loaded** ↔ **inactive-loaded**: User switches to another URL
- **inactive-loaded** ↔ **inactive-unloaded**: Content times out or user unloads
- **inactive-unloaded** → **active-loaded**: User clicks on URL

## Context API

The `IframeContext` provides:

- `states`: Record of all iframe states
- `activeUrlId`: Currently active URL ID
- `dispatch`: Action dispatcher for state updates
- `resetIframe`: Reset iframe content
- `unloadIframe`: Unload iframe content
- `reloadIframe`: Reload iframe content
- `getLoadedUrlIds`: Get list of loaded URL IDs 
