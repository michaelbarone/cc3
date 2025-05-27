## User Flow & Screen Transition Description

**Flow Name:** Desktop "Top Menu" - URL Selection via Hover-Expand

**Actor:** Authenticated User (with "Top Menu" preference active on a Desktop/Tablet device, viewport ≥768px).

**Relevant PRD Stories:** Story 4.3 (Primary), Story 3.8 (AppBar Structure), Story 4.1 (Menu Preference), Story 4.2 (Iframe State Management), Story 3.7 (Data Source), Story 3.9 (Dashboard Shell & Iframe Display).

**Goal:** To allow the user to efficiently browse and select URLs from different groups using a hover-initiated expanded menu within the main application header, minimizing persistent screen real estate usage for navigation.

---

**Pre-conditions:**

1.  The user is authenticated and on the main Dashboard page (`/dashboard`).
2.  The user's `menuPosition` preference (from Story 4.1) is set to `TOP`.
3.  The viewport is desktop or larger tablet (e.g., ≥768px).
4.  The main Application Header (`AppBar` from Story 3.8) is visible and configured for "Top Menu" layout (i.e., it has a designated central area for URL/Group navigation content).
5.  The "Detailed Top Menu Navigation Component" (from Story 4.3) is rendered within this central area of the `AppBar`.
6.  This component is currently displaying its "Normal (Non-Hovered) State":
    * It shows the `name` of the *currently selected URL Group*.
    * It shows a horizontal list/row of URL items (displaying icon/`Url.faviconUrl` and `effectiveTitle`) for *only this currently selected group*.
    * Each URL item in this row has its visual state correctly rendered:
        * Opacity `0.5` if its corresponding iframe content is "unloaded".
        * Opacity `1.0` if its corresponding iframe content is "loaded".
        * A blue underline if it is the "active" URL (i.e., its iframe is currently visible).
7.  The `IframeProvider` and `useIframeManager` hook (from Story 4.2) are managing the states of all iframes.

---

**Trigger for Flow:** The user moves their mouse cursor to hover over the area in the `AppBar` displaying the "currently selected group name" and its associated horizontal URL items (the "Normal State Display" area of the Top Menu Navigation Component).

---

**Sequence of Events & UI Changes:**

1.  **Hover Detected & Menu Expansion:**
    * **System Action:** The Top Menu Navigation Component detects the hover event on its designated trigger area.
    * **UI Change:**
        * An "Expanded View" (implemented, for example, as an MUI `Popper` or a custom absolutely positioned `div` with appropriate styling and z-index) smoothly transitions into view. The transition duration is approximately 300ms.
        * This Expanded View appears directly below the AppBar's central navigation area, potentially overlaying the very top edge of the main content/iframe area slightly, but it should not cause a reflow of the primary page content below.
        * The Expanded View is populated with:
            * At the top: The currently selected group's name and its full horizontal list/row of URL items (mirroring the Normal State Display, with all visual state indicators like opacity and active underline correctly shown).
            * Below this section: All other URL Groups accessible to the user are listed by name (e.g., `Group.name`).
            * Below each of these other group names: Their respective horizontal list/row of URL items (icons/titles) is displayed. Each of these URL items also correctly reflects its own "loaded" (opacity 1.0) or "unloaded" (opacity 0.5) status. Only one URL in the entire system can have the "active" (blue underline) indicator.
    * **System State:** No change to the `activeUrlIdentifier` or the "selected group" state at this point.

2.  **User Interacts with Expanded View:**
    * **User Action:** The user moves their mouse cursor within the bounds of the now visible Expanded View.
    * **UI Change:** Individual URL items or Group headers within the Expanded View may show standard hover effects (e.g., slight background color change) to indicate interactivity as the mouse passes over them.
    * **System State:** No change yet.

3.  **User Selects a URL from the Expanded View:**
    * **User Action:** The user clicks on a specific URL item (let's call it "Target_URL" belonging to "Target_Group") within the Expanded View. This "Target_URL" could be from the initially current group or from one of the other groups displayed.
    * **System Action (via `useIframeManager` and local state):**
        * The `setActiveUrl(Target_URL_Identifier, Target_URL_OriginalSrc)` function (from Story 4.2) is called. This will handle making "Target_URL" the active URL, and if it's currently "unloaded", it will trigger the process to set its iframe's `src` from `data-src` to initiate loading.
        * The application's state for the "currently selected group" is updated to "Target_Group".
    * **UI Change (Menu):**
        * The Expanded View smoothly collapses/hides (e.g., 300ms animation).
        * The "Normal State Display" in the AppBar's central area immediately updates to reflect the new selection:
            * "Target_Group" name is displayed.
            * The horizontal list/row of URL items for "Target_Group" is displayed.
            * "Target_URL" item within this list now shows the "active" indicator (blue underline, opacity 1.0). If it was previously unloaded, its opacity changes from 0.5 to 1.0.
            * If a different URL was previously active, its "active" indicator is removed (it will now show as opacity 1.0 if loaded and inactive, or 0.5 if it became unloaded due to future cache limits - though for now, it remains loaded).
    * **UI Change (Iframe Area - handled by Story 3.9 logic driven by Story 4.2 state):**
        * The iframe corresponding to "Target_URL" becomes `visibility: visible`.
        * If "Target_URL" was newly activated and needs to load, its iframe `src` is set, and loading indicators appear in the iframe area. Upon successful iframe `onload`, `markUrlAsLoaded("Target_URL_Identifier")` is called, confirming its "loaded" state (opacity 1.0).
        * If "Target_URL" was already loaded and just hidden, its iframe (with preserved state) becomes visible without reloading its `src`.
        * Any previously visible iframe becomes `visibility: hidden`.

4.  **User Moves Mouse Away (No Selection Made from Expanded View):**
    * **User Action:** The user moves their mouse cursor out of the boundaries of both the original trigger area in the AppBar and the Expanded View, without clicking on any URL item.
    * **System Action:** After a brief, appropriate delay (to prevent accidental collapse during minor mouse movements), the Top Menu Navigation Component detects the mouse-out condition.
    * **UI Change:** The Expanded View smoothly collapses/hides.
    * **System State:** The "Normal State Display" in the AppBar remains unchanged, continuing to show the previously selected group and active URL. No change to `activeUrlIdentifier` or "selected group" state.

---

**Post-conditions:**

* If a URL was selected: The Dashboard reflects the newly active URL in the iframe, and the Top Menu navigation in the AppBar has updated its "Normal State Display" to the new context.
* If no URL was selected and hover ended: The Dashboard is back to its state before the hover, with the Top Menu navigation in its compact "Normal State Display."

---

This textual description outlines the expected flow and screen transitions for this specific "Top Menu" interaction. This level of detail, when applied to all key interactions and captured within or alongside the PRD's User Stories, helps ensure clarity for development and testing.

Is this example flow description the kind of "design output context" you were looking for? We can do this for other complex areas if you wish, or if you feel the PRD stories themselves (once updated by John with all our design session details) will sufficiently cover this, we can proceed accordingly.