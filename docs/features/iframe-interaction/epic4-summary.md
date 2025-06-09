# Epic 4: Advanced Iframe Interaction & User Personalization

## Overview

Epic 4 implements a highly interactive and customizable user dashboard experience including:
- User-selectable menu positions (Top or Side)
- Theme preferences (Light, Dark, System)
- Advanced iframe state management with memory preservation
- Rich navigation experiences for desktop and mobile
- Enhanced interaction patterns for URLs (click, long-press)

## Key Features Implemented

### 1. Persistent User Settings

- **Menu Position**: Users can choose between "Top Menu" and "Side Menu" layouts
- **Theme Preferences**: Support for Light, Dark, and System themes
- **Database Integration**: Settings are persisted in the database via the User-UserSetting relation
- **API Endpoints**: Dedicated endpoints for fetching and updating user settings
- **Dynamic Layout**: UI adapts based on user preferences

### 2. Core Iframe State Management

- **IframeProvider Context**: Manages iframe states using React Context API
- **State Preservation**: Maintains iframe state (scroll position, form inputs) when switching between URLs
- **URL Loading Control**: Explicit control over when URLs are loaded, unloaded, or reloaded
- **Visual Feedback**: Clear indicators for loading status and active state
- **Error Handling**: Robust error handling for load failures

### 3. Desktop "Top Menu" Navigation

- **Hover-to-Expand**: Rich dropdown experience with groups and URLs
- **Visual States**: Clear indicators for loaded/unloaded and active states
- **Responsive Design**: Adapts to different screen sizes with condensed display for tablets
- **Performance Optimization**: Efficient rendering with memoization

### 4. Desktop "Side Menu" Navigation

- **Full-Height Panel**: Persistent side navigation with collapsible behavior
- **Accordion Groups**: Organized display of URL groups and items
- **Collapsed State**: Icons-only view with tooltips when panel is collapsed
- **Visual Indicators**: Consistent states for loaded/unloaded and active URLs

### 5. Advanced URL Interactions

- **Single-Click Behavior**: Activate, load, or reload content
- **Long-Press Detection**: 2-second hold with visual progress indicator
- **Content Unloading**: Ability to unload content to free resources
- **Visual Feedback**: Consistent indicators across all menu types
- **Haptic Feedback**: Vibration feedback on mobile devices

### 6. Mobile-Specific Adaptations

- **Optimized Drawer**: Enhanced mobile drawer with consistent interaction patterns
- **Touch Optimization**: Larger touch targets and improved feedback
- **State Persistence**: Drawer expanded state remembers across sessions
- **Smooth Animations**: Optimized transitions for mobile devices
- **Visual Consistency**: Same visual indicators as desktop experience

## Technical Implementation Highlights

### React Context Architecture

The implementation uses React Context API for efficient state management:

```tsx
// IframeProvider manages iframe states
export function IframeProvider({ children }: IframeProviderProps) {
  const [managedIframes, setManagedIframes] = useState<Map<string, IframeData>>(new Map());
  const [activeUrlIdentifier, setActiveUrlIdentifier] = useState<string | null>(null);
  
  // Methods for manipulating iframe states
  const setActiveUrl = useCallback((id: string, srcForDataSrc: string) => { /* ... */ }, []);
  const markAsLoaded = useCallback((id: string) => { /* ... */ }, []);
  const markAsUnloaded = useCallback((id: string) => { /* ... */ }, []);
  // ...
}

// Custom hook for components to access iframe management
export const useIframeManager = () => {
  const context = useContext(IframeContext);
  if (!context) {
    throw new Error("useIframeManager must be used within an IframeProvider");
  }
  return context;
};
```

### Interaction Patterns

The implementation uses custom hooks for complex interactions:

```tsx
// useLongPress hook for long-press detection
export function useLongPress({
  duration = 2000,
  feedbackDelay = 300,
  onLongPress,
  onClick,
}) {
  // State and timer management for detecting long press
  // Visual progress feedback
  // Handling for press/release/cancel events
}

// Usage in URL items
const { handlers, state } = useLongPress({
  onLongPress: handleLongPress,
  onClick: handleClick,
});

// Apply to elements
<ListItemButton {...handlers} sx={{ /* styles based on state */ }}>
  {/* content */}
</ListItemButton>
```

### Mobile-Specific Enhancements

```tsx
// Mobile-specific adjustments
const isMobile = useMediaQuery(theme.breakpoints.down("md"));

// Conditional styling
sx={{
  // Increase touch target size on mobile
  py: isMobile ? 1.5 : 1,
  minHeight: isMobile ? 56 : 48,
  
  // Mobile-specific feedback
  ...(isMobile && {
    transition: "background-color 0.2s ease",
    "&:active": {
      bgcolor: theme.palette.action.selected,
    },
  }),
}}

// Haptic feedback
if (navigator.vibrate) {
  navigator.vibrate([100, 50, 100]);
}

// Session persistence
localStorage.setItem("mobileExpandedGroupId", expandedGroupId);
```

## Testing

To verify the implementation, we've created a comprehensive test script (`tests/epic4-mobile-test.ps1`) that covers:
- Visual state verification
- Click and long-press interactions
- Mobile touch optimization
- Cross-platform consistency

## Future Considerations

1. **Performance Monitoring**: Consider implementing performance tracking for iframe loading and state management
2. **Accessibility Enhancements**: Ensure all navigation components are fully keyboard accessible and screen reader friendly
3. **Progressive Enhancement**: Consider fallback experiences for older browsers
4. **Advanced State Persistence**: Investigate potential for persisting URL active/loaded states between sessions
5. **Touch Gesture Expansion**: Explore additional touch gestures for mobile users
6. **Network Status Integration**: Provide feedback about offline state or slow connections affecting iframe loading 
