### Epic 4: Advanced Iframe Interaction & User Personalization
**Goal:** Implement a highly interactive and customizable user dashboard experience, including user-selectable menu positions (Side or Top for desktop URL/Group navigation), advanced iframe state management (persisting multiple loaded iframes with CSS `visibility` for state retention, and an explicit unload mechanism via long-press), clear visual indicators in the menus for URL states (active/inactive, loaded/unloaded using opacity/underline/border), and specific performance optimizations. (Search feature was removed).

* **Story 4.1: Implement Persistent User Settings for Layout (Menu Position & Theme)**
    * **As an** Authenticated User,
    * **I want** to be able to choose my preferred main navigation menu position for desktop viewing (Top Menu or Side Menu) and my preferred application theme (Light, Dark, or System default) via my User Settings page. These preferences should be saved to my account and applied consistently across the application, with the header and dashboard layouts dynamically adapting to my chosen menu position and theme.
    * **So that** I can personalize my ControlCenter interface for optimal usability, comfort, and visual preference, and have these settings persist across my sessions and devices.
    * **Acceptance Criteria:**
        * `[ ]` (Schema Definition - `UserSetting` Model) A new Prisma model `UserSetting` is defined with a strict one-to-one relationship to `User` (`userId String @id`, `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`).
        * `[ ]` `UserSetting` includes: `theme Theme @default(SYSTEM)` (Enum: `LIGHT DARK SYSTEM`), `menuPosition MenuPosition @default(TOP)` (Enum: `TOP SIDE`), `updatedAt DateTime @updatedAt`.
        * `[ ]` The `User` model is updated with the inverse relation: `settings UserSetting?`.
        * `[ ]` A Prisma migration for these schema changes is generated and successfully applied. Prisma Client is regenerated.
        * `[ ]` Logic is added to the user creation process (e.g., Story 1.2 for initial admin, Story 2.3 for admin-created users) to automatically create a corresponding `UserSetting` record with default values (`theme: SYSTEM` - falling back to DARK if OS pref undetectable, `menuPosition: TOP`) whenever a new `User` is created.
        * `[ ]` (Backend API for User Settings) New secure API endpoints `GET /api/user/settings` and `PUT /api/user/settings` are created.
        * `[ ]` `GET /api/user/settings` fetches the `UserSetting` record for the authenticated user (should always find a record due to AC 1.5).
        * `[ ]` `PUT /api/user/settings` accepts `theme` (LIGHT/DARK/SYSTEM) and/or `menuPosition` (TOP/SIDE), updates the existing `UserSetting` record. Validates enum values. Returns updated settings. Both endpoints protected, user-specific.
        * `[ ]` (Session Data Enhancement) NextAuth.js session object (and JWT) includes persisted `theme` and `menuPosition` from `UserSetting`.
        * `[ ]` (User Settings Page UI - on `/settings/profile`) A "Layout & Appearance Preferences" section is added.
        * `[ ]` UI controls (MUI `RadioGroup` or `SegmentedButton`) for "Preferred Menu Position (Desktop)" (Options: Top, Side) with small static image previews, reflecting current saved preference.
        * `[ ]` UI controls (MUI `RadioGroup` or `SegmentedButton`) for "Preferred Theme" (Options: Light, Dark, System) with themed preview boxes (showing bg color, themed text "AppName" & logo placeholder, theme name text; selected theme preview has blue highlight), reflecting current saved preference.
        * `[ ]` "Save Preferences" button calls `PUT /api/user/settings`. Success/error `Snackbar`. UI dynamically updates on save without full page reload.
        * `[ ]` (Dynamic Header Adaptation - affects Story 3.8) Global Application Header (Story 3.8) reads `menuPosition` from session. Desktop: Adapts structure (three-section for "Top Menu" pref vs. hidden for "Side Menu" pref). Mobile header consistent.
        * `[ ]` (Dynamic Dashboard Layout - affects Story 3.9) Dashboard (Story 3.9) reads `menuPosition`. Desktop: "Top Menu" pref -> URL/Group nav in AppBar's central area (content by Story 4.3). "Side Menu" pref -> persistent side panel for URL/Group nav (content by Story 4.4); top AppBar URL nav area hidden, AppBar itself hidden. Mobile: always drawer.
        * `[ ]` (Theme Application & Header Toggle Update - affects Story 3.8) MUI ThemeProvider uses persisted `UserSetting.theme`. Header theme toggle (Story 3.8) displays current persisted state and updates it via `PUT /api/user/settings`. "SYSTEM" theme respects OS `prefers-color-scheme` (reload pick-up sufficient, fallback to DARK if OS pref undetectable).
        * `[ ]` (Default Values & Persistence) Settings saved to backend. Defaults (`theme: SYSTEM` with DARK fallback, `menuPosition: TOP`) applied on `UserSetting` creation.

* **Story 4.2: Implement Core Iframe State Management (Tracking Multiple Mounted Iframes, Loaded/Unloaded States, Active URL with `src`/`data-src` control)**
    * **As the** Frontend System / Dashboard UI,
    * **I want** a robust client-side state management system (e.g., using React Context via an `IframeProvider` and a custom hook like `useIframeManager`) that tracks multiple iframes (kept mounted with visibility controlled by CSS `visibility: hidden`), manages their "loaded" (content in `src`) vs. "unloaded" (`src=""`) states using a `src`/`data-src` attribute pattern, and identifies the "active" URL for display. It must also apply default restrictive `sandbox` attributes to iframes.
    * **So that** the application can support efficient, stateful switching between iframes, with precise control over content loading and resource usage, providing accurate data for visual state indicators (opacity for loaded/unloaded states) in the navigation menus, while maintaining security.
    * **Acceptance Criteria:**
        * `[ ]` (`IframeProvider` Context) React Context (`IframeStateContext`) & Provider (`<IframeProvider>`) wraps dashboard. Stores: `managedIframes: Map<string, { originalSrc: string; currentSrc: string; isLoaded: boolean; }>` (key: URL identifier), `activeUrlIdentifier: string | null`.
        * `[ ]` (`useIframeManager` Hook) Exposes: `activeUrlIdentifier`, `getIframeData(id)`, `isUrlLoaded(id)`, `setActiveUrl(id, srcForDataSrc)` (signals iframe `src` set from `data-src` if unloaded/new), `markAsLoaded(id)` (on iframe `onload`), `markAsUnloaded(id)` (signals iframe `src` to `""`), `triggerReload(id)`, `getAllManagedIframesForRender()` (returns array `{ identifier, dataSrc, srcToRender, isLoaded, isActive }`). Hook interface is optimized for efficient updates using memoized React Context and `React.memo` on consumers.
        * `[ ]` (Dashboard Iframe Rendering) Uses `useIframeManager`. Iterates `getAllManagedIframesForRender()` to render `<iframe>`s. Each has `key`, `src` (bound to `srcToRender`, initially `""`), `data-src` (actual `originalUrl`). `setActiveUrl` needing load triggers dashboard to update target iframe `src` from `data-src`.
        * `[ ]` (CSS Visibility Control) Active iframe: `visibility: visible`. Others: `visibility: hidden; position: absolute; left: -9999px;`.
        * `[ ]` (Iframe Sandbox Attributes) All iframes rendered include `sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"`.
        * `[ ]` (Updating "Loaded" Status) Iframe wrapper monitors `onload` (calls `markAsLoaded`) and `onerror` (status remains `loaded: false`). UI error display for active iframe.
        * `[ ]` (State Preservation Verification) Scenario: Load A -> scroll -> Load B -> Show A again; A's state (scroll, form inputs) preserved, no `src` reload.
        * `[ ]` (Initial URL Load) Integrates with Story 3.9's initial auto-load.
        * `[ ]` (Foundation for Opacity) `isUrlLoaded()` provides state for menu item opacity.

* **Story 4.3: Implement Detailed Desktop/Tablet "Top Menu" URL/Group Navigation Experience (with Opacity/Underline Indicators)**
    * **As an** Authenticated User (with "Top Menu" as my preferred desktop layout),
    * **I want** the URL/Group navigation within the main application header's central area to function as a "hover-to-expand" menu. In its normal (non-hovered) state, it should show my currently selected group's name alongside a horizontal row of its URL items (icons/titles) with visual indicators for "loaded" (opacity 1.0), "unloaded" (opacity 0.5), and "active" (blue underline) states. Hovering over this area should expand a temporary view showing other accessible groups and their respective URLs, allowing me to quickly switch my active URL and group.
    * **So that** I have a rich, intuitive, and space-efficient "Top Menu" experience for navigating my URLs, consistent with the detailed design specification (hover-expand model and opacity/underline visual states).
    * **Acceptance Criteria:**
        * `[ ]` (Conditional Rendering & Placement) Renders in `AppBar` central area if `menuPosition === TOP` & desktop/tablet (≥768px). Replaces simpler Epic 3 top menu nav.
        * `[ ]` (Normal State Display) Consumes groups/URLs (Story 3.7 data) & iframe states (Story 4.2 hook). Displays current selected group `name`. Displays horizontal row of URL items for *that group only*. URL items show `faviconUrl` (or fallback, title prominent if broken) & `effectiveTitle`. Visual states: opacity 0.5 (unloaded), 1.0 (loaded), blue underline (active). Default group/URL reflected.
        * `[ ]` (Hover-to-Expand Interaction) Hovering selected group name/area triggers expanded view (MUI `Popper`/`div`) below AppBar central nav area (no page reflow). Expanded view lists: current group + its URLs; other groups + their URLs (all with correct visual states). Mouse-out collapses view smoothly (with suitable delay).
        * `[ ]` (Interaction from Expanded View) Clicking any URL: calls `setActiveUrl()`, updates "selected group" state, collapses expansion. Normal display updates.
        * `[ ]` (Responsive Adaptation - Tablet: 768px - 1199px) Horizontal URL rows adapt (condensed spacing). If URL row overflows: becomes horizontally scrollable (touch-swipe). "More" ("•••") icon at end opens MUI `Menu` with overflowed URL items for that group's row; selection works as above. Dropdown touch-optimized.
        * `[ ]` (Layout & Scrolling) Fits in AppBar/popper. No main page scroll. App 100% viewport height.
        * `[ ]` (Integration & Performance) Activates on `menuPosition === TOP`. Consumes `useIframeManager`, group/URL data. Updates active URL/selected group. Fits in AppBar (Story 3.8). Smooth interactions (300ms anim). Efficient rendering (memoization).

* **Story 4.4: Implement Desktop/Tablet "Side Menu" Navigation Experience (with Opacity/Border Indicators)**
    * **As an** Authenticated User (with "Side Menu" as my preferred desktop/tablet layout),
    * **I want** the main application navigation to be presented as a persistent, full-height "Side Navigation Panel" on the left. This panel should include the Application Logo/Name at its top, vertically stacked expandable URL groups and their URLs (with opacity indicators for "loaded/unloaded" states and a blue right border for the "active" URL) in the main area, and the User Menu functionality at its bottom. This panel should be collapsible on desktop and tablet to an icons-only view, and it replaces the top AppBar on these larger views.
    * **So that** I have a rich, well-organized, and navigable "Side Menu" experience for accessing my URLs, consistent with the detailed design specification.
    * **Acceptance Criteria:**
        * `[ ]` (Conditional Rendering) Renders if `menuPosition === SIDE` & desktop/tablet (≥768px). Main `AppBar` (Story 3.8) is **not rendered**. Top Menu nav (Story 4.3) hidden.
        * `[ ]` (Side Panel Structure - Expanded Desktop ≥768px) Full-height, persistent left panel (MUI `Drawer` `variant="persistent"` or custom `div`, pushes content). Width ~20% or fixed (250-300px). Fixed position. Internal content scrollable. Main content (iframe) resizes. No main page scroll.
            * Panel Content (Expanded): Top: App Logo/Name (Story 2.4). Collapse/Expand toggle button (MUI `IconButton` chevron) in panel's top section (e.g. top right of panel), available on full desktop view. Middle (Navigation): Vertical list of URL Groups (accordion style), sorted. Expanding group shows its URLs. URL items: `faviconUrl` (or fallback, title if broken) AND `effectiveTitle`. Visual states: opacity 0.5 (unloaded), 1.0 (loaded), blue **right side border** (active). Selected group expanded by default. Bottom: Reusable User Menu component (Story 3.8) rendered as accordion section ("User Options") or list.
        * `[ ]` (Side Panel Collapsible Behavior - Desktop/Tablet ≥768px) Clicking toggle animates panel width.
            * Collapsed State (Icons-Only): Panel shrinks (~72px). Group headers show abbreviated initials in circle/avatar display (from group name) or generic group icon. URLs in (conceptually) expanded group show only `Url.faviconUrl`. User Menu collapses to icon trigger (opens small popper/menu). MUI `Tooltip` on hover for all icons.
        * `[ ]` Main content area resizes smoothly. User's collapsed/expanded state preference persists for session (e.g., `localStorage`).
        * `[ ]` (URL/Group Interaction) Click group header expands/collapses. Click URL sets active URL. Indicators update.
        * `[ ]` (Integration) Renders on `menuPosition === SIDE`. No `AppBar` (desktop/tablet). Consumes `useIframeManager`, group/URL data. Updates active URL/selected group.
        * `[ ]` (Performance & Transitions) Smooth animations (300ms) for panel/accordion. Efficient rendering.

* **Story 4.5: Implement Click (Activate/Ensure Loaded/Reload) and Long-Press (Unload) for URLs with Specific Unload UI**
    * **As an** Authenticated User,
    * **I want** specific and intuitive behaviors when I single-click or long-press (for 2 seconds with a visual progress indicator: orange, 2-3px thick, bottom edge of item, 0.3s delay before animation) on a URL item in any navigation menu:
        * A single click should activate the URL (loading it if currently unloaded, making it visible if loaded but hidden, or reloading it if already active and visible).
        * A successful long press should unload that URL's iframe content, make its iframe hidden, and display a "Content Unloaded" message (centered text) with a "Reload Content" button (MUI outlined with refresh icon) in the iframe area.
    * **So that** I have powerful and clear control over URL loading, viewing, resource management, and can easily recover unloaded content within the dashboard.
    * **Acceptance Criteria:**
        * `[ ]` (Single-Click Behavior - All Menus) If URL not active OR unloaded: `setActiveUrl()` (loads via `src` from `data-src`). Menu item "active" (opacity 1.0 + indicator). "Content Unloaded" message (if visible) cleared. If URL active AND loaded: Reloads active iframe content (e.g., `src` from `data-src` again). Loading indicators. Menu item "active."
        * `[ ]` (Long-Press Detection & Visual Feedback - `useLongPress`) Hook/logic detects 2s sustained press (mouse/touch) with 0.3s delay before animation. Visual progress bar (orange, 2-3px thick, animates left-to-right along bottom edge of URL item) during hold. Optional tooltip ("Hold for 2s to unload"). Event listeners managed.
        * `[ ]` (Long-Press Action - Unload) On 2s press: `markUrlAsUnloaded()` (Story 4.2 - sets iframe `src=""`, state "loaded: false"). Menu item "unloaded" (opacity 0.5, loses active indicator). Haptic feedback on mobile.
        * `[ ]` (Behavior if Active URL Unloaded) Unloaded URL's iframe `visibility: hidden`. Main content area displays: centered "Content Unloaded" text + "Reload Content" MUI `Button` (`variant="outlined"` with refresh icon); background matches current theme. Clicking "Reload" calls `setActiveUrl()` for that URL, re-initiating load; message/button removed; iframe loaders appear; menu item "active". Active indicator on menu item removed when unloaded; `activeUrlIdentifier` may persist (but item not styled active) or become null. Selecting another URL loads it, clears "Content Unloaded" message.
        * `[ ]` (Cancellation of Long Press) Release before 2s or move pointer away: long-press cancelled, progress indicator resets. No single-click triggered (click fires on up event if no long press detected/aborted).
        * `[ ]` (Integration) Actions update `useIframeManager` states. Menu indicators update instantly.

* **Story 4.6: Ensure Advanced Features & Opacity/Underline/Border Indicators Work in Mobile Drawer Navigation**
    * **As an** Authenticated User (on mobile),
    * **I want** the mobile navigation drawer (from Story 3.9, toggled by Story 3.8's header) to accurately display the refined URL state indicators (opacity for loaded/unloaded, and an active indicator: blue right side border). I also want advanced interactions like long-press to unload URLs (with haptic feedback and progress indicator) to be fully functional and optimized for touch within this mobile drawer environment.
    * **So that** I have a consistent, rich, and usable experience managing and interacting with my URLs on mobile devices, equivalent in core advanced functionality to the desktop experiences.
    * **Acceptance Criteria:**
        * `[ ]` (Mobile Drawer URL Item Visual States) URL items in mobile drawer (Story 3.9 accordion) display universal visual states from `useIframeManager` (Story 4.2): opacity 0.5 (unloaded), 1.0 (loaded). Active URL has blue **right side border**.
        * `[ ]` (Click Interaction in Mobile Drawer) Single-click triggers "Activate/Ensure Loaded/Reload" (Story 4.5). Iframe updates, drawer closes, indicators update.
        * `[ ]` (Long-Press Interaction in Mobile Drawer) Long-press (2s) triggers "Unload URL Content" (Story 4.5). Visual progress bar on item (bottom edge) visible on touch target. Haptic feedback. Item "unloaded" (opacity 0.5). Iframe area shows "Content Unloaded" UI.
        * `[ ]` (Mobile Usability & Touch Optimization) Touch targets adequate. Animations smooth on mobile. Drawer state (expanded group) remembered during session (no internal scroll persistence).
        * `[ ]` (Consistency) State changes via `useIframeManager` consistent with desktop. "Loaded"/"unloaded" status universal.
