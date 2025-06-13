# ControlCenter Navigation System

## Overview

The ControlCenter navigation system provides multiple ways for users to access and manage their URL groups and individual URLs. The system adapts to different device sizes and user preferences, offering optimized experiences for desktop, tablet, and mobile users.

Users can choose between two navigation styles on desktop/tablet:
- **Top Menu**: A space-efficient menu integrated into the application header
- **Side Menu**: A full-height panel on the left side of the application

On mobile devices, the navigation is consistently presented as a collapsible drawer regardless of the user's desktop preference.

## Desktop Navigation - Top Menu

### Overview

The Top Menu navigation is a space-efficient, interactive menu system displayed in the central area of the application header (AppBar) for desktop and tablet users who have selected "Top Menu" as their preferred layout. It provides quick access to URL groups and their contained URLs with visual indicators for content state.

### Prerequisites

- User has authenticated successfully
- User's `menuPosition` preference is set to `TOP` (from `UserSetting` table)
- Viewport is desktop or tablet size (≥768px)
- Main Application Header (`AppBar`) is visible and configured for "Top Menu" layout

### Visual States & Indicators

All URL items in the Top Menu display consistent visual states that indicate their current status:

- **Unloaded URL**: opacity 0.5 - Content is not currently loaded in an iframe
- **Loaded URL (not active)**: opacity 1.0 - Content is loaded but not currently visible
- **Active URL**: opacity 1.0 with blue underline - Content is loaded and currently visible

### Interaction Flow

#### Normal State (Non-Hovered)

1. The AppBar's central area displays:
   - The name of the currently selected URL Group
   - A horizontal row/list of URL items for only this selected group
   - Each URL item shows:
     - Icon (`Url.faviconUrl` or appropriate fallback)
     - Title (`effectiveTitle` - group-specific title or global title)
     - Visual state indicators as described above

2. If a URL's favicon fails to load:
   - The broken icon is hidden
   - The URL's title becomes the primary identifier

#### Hover-to-Expand Interaction

1. When the user hovers over the central navigation area:
   - An expanded view smoothly transitions into view (300ms animation duration)
   - This expanded view appears directly below the AppBar's central area
   - It may slightly overlay the top edge of the main content/iframe area
   - No reflow of page content occurs

2. The expanded view contains:
   - At the top: The currently selected group's name and its full list of URLs
   - Below this: All other accessible URL groups listed by name
   - Under each group name: The horizontal list of URLs for that group
   - All URL items maintain their visual state indicators (opacity and active underline)

3. As the user moves their cursor within the expanded view:
   - Individual URL items or group headers may show hover effects
   - No state changes occur until selection

#### URL Selection

1. When a user clicks on a specific URL in the expanded view:
   - The `setActiveUrl()` function from the iframe management system is called
   - If the URL is currently unloaded, its iframe begins loading
   - The application updates the "currently selected group" state
   - The expanded view smoothly collapses (300ms animation)

2. The normal state display immediately updates to reflect:
   - The new selected group name
   - The horizontal list of URLs for that group
   - The selected URL now shows the "active" indicator (blue underline)
   - Previously active URLs lose their active indicator

3. In the iframe display area:
   - The iframe corresponding to the selected URL becomes visible
   - If newly activated and loading, appropriate loading indicators appear
   - Previously visible iframes become hidden (using `visibility: hidden`)

#### Mouse-Out Behavior

If the user moves their cursor away from both the trigger area and expanded view:
   - After a brief delay (to prevent accidental collapse)
   - The expanded view smoothly collapses/hides
   - No change to the active URL or selected group occurs

### Tablet Responsiveness (768px - 1199px)

1. On tablet viewports:
   - The horizontal URL rows use condensed spacing
   - If URL items overflow the available width:
     - The row becomes horizontally scrollable (touch-swipe enabled)
     - A "More" icon ("•••") appears at the end of visible items
   
2. Clicking the "More" icon:
   - Opens a MUI `Menu` component
   - Displays the overflowed URL items for that group
   - Selection works the same as in the expanded view

### Technical Implementation

The Top Menu navigation component:
- Renders in the AppBar's central area only when `menuPosition === 'TOP'` and viewport ≥768px
- Consumes data from the API endpoint defined in Story 3.7 (`GET /api/dashboard/urlGroups`)
- Utilizes the `useIframeManager` hook from Story 4.2 to manage iframe states
- Updates active URL and selected group state via React Context
- Uses efficient rendering techniques (memoization) for performance

### Integration Points

- Integrates with AppBar component (Story 3.8)
- Consumes URL/Group data API (Story 3.7)
- Uses iframe state management system (Story 4.2)
- Implements interactions defined in Story 4.5 (Click/Long-Press)

## Desktop Navigation - Side Menu

### Overview

The Side Menu navigation is a full-height, persistent panel displayed on the left side of the application for desktop and tablet users who have selected "Side Menu" as their preferred layout. It completely replaces the top AppBar for these users and provides a comprehensive, vertically-oriented navigation experience.

### Prerequisites

- User has authenticated successfully
- User's `menuPosition` preference is set to `SIDE` (from `UserSetting` table)
- Viewport is desktop or tablet size (≥768px)

### Visual States & Indicators

All URL items in the Side Menu display consistent visual states that indicate their current status:

- **Unloaded URL**: opacity 0.5 - Content is not currently loaded in an iframe
- **Loaded URL (not active)**: opacity 1.0 - Content is loaded but not currently visible
- **Active URL**: opacity 1.0 with blue right border - Content is loaded and currently visible

### Side Panel Structure (Expanded State)

1. **Panel Layout**:
   - Full-height, persistent left panel (MUI `Drawer` or custom `div`)
   - Width: ~20% or fixed (250-300px)
   - Fixed position with scrollable internal content
   - Main content (iframe) area resizes accordingly

2. **Panel Content Sections**:
   - **Top**: Application Logo/Name (from branding settings)
   - **Top-Right**: Collapse/Expand toggle button (chevron icon)
   - **Middle**: Vertical list of URL Groups in accordion style
   - **Bottom**: User Menu component (as accordion section or list)

3. **Group & URL Display**:
   - Groups are displayed as expandable accordion sections
   - Expanding a group reveals its contained URLs as a vertical list
   - URL items show:
     - Icon (`Url.faviconUrl` or appropriate fallback)
     - Title (`effectiveTitle` - group-specific title or global title)
     - Visual state indicators as described above
   - Selected group is expanded by default

### Collapsible Behavior

1. **Collapsed State (Icons-Only)**:
   - Panel width shrinks to approximately 72px
   - Group headers show abbreviated initials in circle/avatar display or generic group icon
   - URLs show only their favicon
   - User Menu collapses to icon trigger
   - All icons have MUI `Tooltip` on hover for identification

2. **Toggle Interaction**:
   - Clicking the chevron icon animates the panel between expanded and collapsed states
   - Main content area smoothly resizes in response
   - User's collapsed/expanded state preference persists for the current session (via `localStorage`)

### Interaction Flow

1. **Group Navigation**:
   - Clicking a group header expands/collapses that group's accordion section
   - Only one group can be expanded at a time in the accordion

2. **URL Selection**:
   - Clicking a URL item:
     - Sets it as the active URL (via `setActiveUrl()`)
     - Updates visual indicators across all menus
     - Makes corresponding iframe visible in the main content area

3. **Long-Press for Unload**:
   - Long-pressing (2 seconds) on a URL item:
     - Shows visual progress indicator (orange, 2-3px thick bar along bottom edge)
     - Unloads the URL's iframe content
     - Updates its visual state to "unloaded" (opacity 0.5)

### Technical Implementation

The Side Menu navigation component:
- Renders only when `menuPosition === 'SIDE'` and viewport ≥768px
- Replaces the standard AppBar completely on desktop/tablet
- Consumes data from the API endpoint defined in Story 3.7 (`GET /api/dashboard/urlGroups`)
- Utilizes the `useIframeManager` hook from Story 4.2 to manage iframe states
- Uses efficient rendering techniques (memoization) for performance

### Integration Points

- Replaces AppBar component (Story 3.8) on desktop/tablet
- Consumes URL/Group data API (Story 3.7)
- Uses iframe state management system (Story 4.2)
- Implements interactions defined in Story 4.5 (Click/Long-Press)

## Mobile Navigation

### Overview

The Mobile Navigation is implemented as a collapsible drawer that provides access to URL groups and their contained URLs on smaller viewport devices. It is consistently available across all mobile views regardless of the user's preferred desktop navigation style.

### Prerequisites

- Viewport is mobile size (<768px)
- User has authenticated successfully

### Visual States & Indicators

All URL items in the Mobile Navigation display consistent visual states that indicate their current status:

- **Unloaded URL**: opacity 0.5 - Content is not currently loaded in an iframe
- **Loaded URL (not active)**: opacity 1.0 - Content is loaded but not currently visible
- **Active URL**: opacity 1.0 with blue right border - Content is loaded and currently visible

### Mobile AppBar & Drawer Structure

1. **Mobile AppBar**:
   - Persistent at the top of the screen
   - Left: Hamburger icon (MUI `IconButton`) to toggle the navigation drawer
   - Center: Application Logo/Name (from branding settings)
   - Right: User Button (avatar only) that opens the User Menu dropdown

2. **Navigation Drawer**:
   - MUI `Drawer` component that slides in from the left side
   - Toggled by the hamburger icon in the AppBar
   - Contains URL Groups in accordion style
   - Each group expands to show its URLs as a vertical list
   - Selected group is expanded by default
   - State (expanded group) remembered during current session

### Interaction Flow

1. **Opening the Drawer**:
   - Tapping the hamburger icon in the AppBar opens the drawer
   - Backdrop overlay dims the main content

2. **Group Navigation**:
   - Tapping a group header expands/collapses that group's accordion section
   - Multiple groups can be expanded simultaneously

3. **URL Selection**:
   - Tapping a URL item:
     - Sets it as the active URL (via `setActiveUrl()`)
     - Updates visual indicators
     - Makes corresponding iframe visible in the main content area
     - Automatically closes the drawer
     - If URL was unloaded, initiates loading process

4. **Long-Press for Unload**:
   - Long-pressing (2 seconds) on a URL item:
     - Shows visual progress indicator (orange, 2-3px thick bar along bottom edge)
     - Provides haptic feedback when complete
     - Unloads the URL's iframe content
     - Updates its visual state to "unloaded" (opacity 0.5)

5. **Closing the Drawer**:
   - Tapping outside the drawer
   - Tapping a URL item
   - Swiping left on the drawer

### Touch Optimization

1. **Touch Targets**:
   - All interactive elements have adequate touch target size
   - Group headers and URL items have sufficient vertical spacing
   - Icons and text are sized appropriately for touch interaction

2. **Haptic Feedback**:
   - Provided on long-press completion
   - Enhances touch interaction experience

### Technical Implementation

The Mobile Navigation:
- Always renders the AppBar with hamburger menu on viewports <768px
- Drawer state (open/closed) managed via React state
- Consumes data from the API endpoint defined in Story 3.7 (`GET /api/dashboard/urlGroups`)
- Utilizes the `useIframeManager` hook from Story 4.2 to manage iframe states
- Implements touch-optimized interactions

### Integration Points

- Works with AppBar component (Story 3.8)
- Consumes URL/Group data API (Story 3.7)
- Uses iframe state management system (Story 4.2)
- Implements interactions defined in Story 4.5 (Click/Long-Press) 
