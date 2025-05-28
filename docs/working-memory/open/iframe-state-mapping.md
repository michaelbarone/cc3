# Current IFrame State Implementation Mapping

## Core Files

### State Management
1. **app/lib/state/iframe-state.tsx** - Primary context provider and reducer
   - **Status**: Keep and improve
   - **Dependencies**: app/types/iframe.ts
   - **Notes**: Core state management that aligns with our documentation

2. **app/components/iframe/state/actions.ts** - Action creators
   - **Status**: Redundant, remove in favor of central state
   - **Dependencies**: app/types/iframe.ts
   - **Notes**: Duplicates functionality in app/lib/state/iframe-state.tsx

3. **app/components/iframe/state/reducer.ts** - Component-specific reducer
   - **Status**: Redundant, remove in favor of central state
   - **Dependencies**: app/types/iframe.ts
   - **Notes**: Uses a different structure from main state and has redundant logic

### Hooks
1. **app/lib/hooks/useIframe.ts** - Main iframe hooks
   - **Status**: Keep and improve
   - **Dependencies**: app/lib/state/iframe-state.tsx, app/types/iframe.ts
   - **Notes**: Contains useUrlManager and useIframeLifecycle which align with our documentation

2. **app/components/iframe/hooks/useIframeEvents.ts**
   - **Status**: Review and possibly incorporate
   - **Notes**: May contain useful event handling logic for TOP menu

3. **app/components/iframe/hooks/useIframeLifecycle.ts**
   - **Status**: Redundant, already have useIframeLifecycle in app/lib/hooks/useIframe.ts
   - **Notes**: Remove in favor of centralized hooks

4. **app/components/iframe/hooks/useIframeVisibility.ts**
   - **Status**: Review and possibly incorporate
   - **Notes**: May contain useful visibility logic for TOP menu

5. **app/components/iframe/hooks/useGlobalIframeContainer.ts**
   - **Status**: Keep for reference
   - **Notes**: Contains global container management that may be useful

6. **app/components/iframe/hooks/useIdleTimeout.ts**
   - **Status**: Not directly related to TOP menu, but keep for reference
   - **Notes**: May be useful for performance optimizations

### Components
1. **app/components/iframe/IframeContainer.tsx** - Main iframe container
   - **Status**: Keep and adapt to new state management
   - **Dependencies**: app/lib/hooks/useIframe.ts, app/types/iframe.ts
   - **Notes**: Contains core rendering logic for iframes

2. **app/components/iframe/IframeWrapper.tsx**
   - **Status**: Review and possibly adapt
   - **Notes**: May contain useful wrapper logic

3. **app/components/iframe/MenuBarAdapter.tsx**
   - **Status**: Side menu specific, remove
   - **Notes**: Related to side menu, not TOP menu

### Types
1. **app/types/iframe.ts** - Core iframe types
   - **Status**: Keep and improve
   - **Notes**: Contains type definitions that align with our documentation

## Flow Analysis

### Current State Flow
1. `IframeProvider` from app/lib/state/iframe-state.tsx wraps the application
2. useIframeState hook provides state and dispatch to components
3. useUrlManager and useIframeLifecycle hooks provide specialized interfaces
4. IframeContainer renders iframes based on state
5. Individual iframe elements are managed globally outside React

### Current Issues
1. Duplicate state management in app/components/iframe/state/
2. Duplicate hooks in app/components/iframe/hooks/
3. Redundant MenuBarAdapter for side menu functionality
4. Complex global iframe management that may be simplified

## Dependencies on Admin/Settings
The following components have dependencies on admin/settings areas:
1. **None identified** - The iframe state management appears to be independent of admin/settings areas

## Next Steps
1. Remove redundant files:
   - app/components/iframe/state/actions.ts
   - app/components/iframe/state/reducer.ts
   - app/components/iframe/hooks/useIframeLifecycle.ts
   - app/components/iframe/MenuBarAdapter.tsx

2. Refactor core files:
   - Update app/lib/state/iframe-state.tsx to match documentation
   - Update app/lib/hooks/useIframe.ts to provide cleaner hook interfaces
   - Update app/components/iframe/IframeContainer.tsx to focus on TOP menu integration

3. Create new implementation:
   - Implement long-press functionality for URL unloading
   - Add visual state indicators for TOP menu
   - Connect existing TOP menu UI with new state management 
