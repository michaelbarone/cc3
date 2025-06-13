# IFrame State Management Overhaul Plan

## Overview
This plan outlines the steps for overhauling the iframe state management system, focusing specifically on the TOP menu integration while preserving existing UI components.

## Current State Assessment
The current iframe state management is overly complex and contains unnecessary code for side menu functionality. We need to rebuild the state management while preserving the existing UI components that are working well.

## Success Criteria
- Clean, focused state management for iframes
- Proper integration with existing TOP menu UI components
- Functioning visual state indicators (opacity, underline)
- Working hover-to-expand menu pattern
- Implemented long-press functionality
- Comprehensive test coverage
- Performance optimization

## Implementation Plan

### Phase 1: Cleanup Existing Implementation (Days 1-2)

#### Tasks:
1. **Identify & Map Current State Implementation**
   - [x] Locate all existing iframe state files in the codebase
   - [x] Document dependencies between components
   - [x] Create map of current state flow
   - [x] Determine what must be preserved vs. removed

2. **Remove Redundant Code (that is not part of the admin or settings area)**
   - [x] Delete side-menu specific implementations (that are not part of the admin or settings area)
   - [x] Remove outdated state patterns
   - [x] Clean up unused hooks and utilities
   - [x] Preserve UI component structure

3. **Establish Clean Foundation**
   - [x] Create minimal state structure
   - [x] Set up basic types and interfaces
   - [x] Maintain existing UI component props
   - [x] Establish clean testing environment

#### Deliverables:
- [x] Clean codebase with only necessary files
- [x] Documented component relationships
- [x] Basic state structure setup

### Phase 2: Implement Core State Management (Days 3-5)

#### Tasks:
1. **Create State Structure**
   - [x] Implement IframeState interface as per documentation
   ```typescript
   interface IframeState {
     urls: Record<string, {
       id: string;
       url: string;
       urlMobile: string | null;
       isLoaded: boolean;
       isVisible: boolean;
       error: string | null;
       retryCount: number;
     }>;
     activeUrlId: string | null;
     initialUrlId: string | null;
   }
   ```
   - [x] Set up actions and reducer
   ```typescript
   type IframeAction =
     | { type: 'INIT_URLS'; payload: { urlGroups: UrlGroup[]; initialUrlId: string } }
     | { type: 'SELECT_URL'; payload: { urlId: string } }
     | { type: 'LOAD_URL'; payload: { urlId: string } }
     | { type: 'UNLOAD_URL'; payload: { urlId: string } }
     | { type: 'SET_ERROR'; payload: { urlId: string; error: string | null } };
   ```
   - [x] Create context provider with proper TypeScript types

2. **Develop Custom Hooks**
   - [x] Build useIframeState hook
   - [x] Implement useUrlManager
   - [x] Create useIframeLifecycle
   - [x] Ensure hooks match existing UI component needs

3. **Establish Testing Framework**
   - [x] Set up test fixtures
   - [x] Create test utilities
   - [x] Implement core state tests

#### Deliverables:
- [x] Functioning state management system
- [x] Custom hooks for component integration
- [x] Test suite for state management

### Phase 3: Connect State to Existing UI (Days 6-8)

#### Tasks:
1. **Connect TopMenuNavigation Component**
   - [x] Integrate state hooks with existing UI
   - [x] Ensure proper state propagation
   - [x] Maintain hover-to-expand functionality
   - [x] Preserve current visual design
   - [x] Create new TopMenuNavigation component with hover-to-expand pattern
   - [x] Implement URL group selection logic
   - [x] Integrate with state management hooks

2. **Enhance UrlMenuItem Component**
   - [x] Connect active/loaded states to new state management
   - [x] Implement long-press unload functionality
   ```typescript
   // Long press hook for unload gesture
   const { handleMouseDown, handleMouseUp, handleMouseLeave, progress } = useLongPress({
     onLongPress: () => onUnload?.(url.id),
     duration: 2000,
     delayStart: 300
   });
   ```
   - [x] Add error state indicators
   - [x] Preserve existing styling
   - [x] Reuse existing UrlItem component
   - [x] Implement visual state indicators (opacity for loaded, underline for active)

3. **Update IFrame Container**
   - [x] Connect to new state management
   - [x] Implement loading/error handling
   - [x] Set up security attributes
   ```html
   <iframe 
     sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
     src={srcToRender}
     data-src={dataSrc}
   />
   ```
   - [x] Maintain existing container layout
   - [x] Create UnloadedContent component for unloaded iframes
   - [x] Update IframeContainer to show UnloadedContent when appropriate

4. **New Tasks**
   - [x] Create AppMenuContent component to handle menu position preferences
   - [x] Create useUrlGroups hook for API data fetching
   - [x] Update useUserPreferences hook for preference management
   - [x] Update DashboardContent to use new components
   - [x] Implement proper MUI styling

#### Deliverables:
- [x] Fully integrated state with UI components
- [x] Working TOP menu with visual indicators
- [x] Functioning long-press behavior
- [x] Secure iframe implementation
- [x] Adaptive menu position based on user preferences

### Phase 4: Testing & Optimization (Days 9-10)

#### Tasks:
1. **Comprehensive Testing**
   - [ ] Unit tests for hooks and state management
   - [ ] Integration tests for TOP menu interaction
   - [ ] Test state persistence and transitions
   - [ ] Verify error handling scenarios

2. **Performance Optimization**
   - [ ] Implement memoization for UI components
   ```typescript
   const MemoizedUrlMenuItem = memo(UrlMenuItem, (prev, next) => {
     return (
       prev.isActive === next.isActive &&
       prev.isLoaded === next.isLoaded &&
       prev.hasError === next.hasError
     );
   });
   ```
   - [ ] Optimize state updates to minimize re-renders
   - [ ] Apply batched updates where possible
   - [ ] Ensure smooth hover-to-expand transitions

#### Deliverables:
- Comprehensive test suite
- Performance optimized components
- Smooth UI interactions

### Phase 5: Final Verification (Days 11-12)

#### Tasks:
1. **Documentation Update**
   - [ ] Update implementation notes if needed
   - [ ] Ensure documentation matches final implementation
   - [ ] Document any deviations from original plan

2. **Final Testing**
   - [ ] Cross-browser testing
   - [ ] Performance profiling
   - [ ] Visual verification of all states

#### Deliverables:
- Updated documentation
- Verified cross-browser functionality
- Performance benchmark results

## Resources Required
- React developers (1-2)
- QA tester for verification
- Design review for visual states

## Risks and Mitigation
1. **Risk**: Existing UI components may not integrate cleanly with new state
   **Mitigation**: Create adapter patterns if needed, minimize changes to UI components

2. **Risk**: Performance issues with hover-to-expand functionality
   **Mitigation**: Implement debouncing, optimize render cycles

3. **Risk**: Browser compatibility issues with iframe security attributes
   **Mitigation**: Test across browsers, provide fallbacks

## Dependencies
- Existing TOP menu UI components
- URL group data structure
- User preferences system

## Next Steps
1. ~~Begin Phase 1: Cleanup Existing Implementation~~
2. ~~Begin Phase 2: Implement Core State Management~~
3. ~~Begin Phase 3: Connect State to Existing UI~~
4. Begin Phase 4: Testing & Optimization
5. Daily standups to track progress
6. Review at the end of each phase

## Timeline Summary
- Phase 1 (Cleanup): Days 1-2 ✓
- Phase 2 (Core State): Days 3-5 ✓
- Phase 3 (UI Integration): Days 6-8 ✓
- Phase 4 (Testing & Optimization): Days 9-10
- Phase 5 (Verification): Days 11-12

Total estimated time: 12 working days 
