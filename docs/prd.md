# ControlCenter - Product Requirements Document (PRD)

**Version:** MVP 1.0
**Date:** May 26, 2025
**Product Manager:** John (BMAD AI Product Manager)

## Table of Contents

1.  [Goal, Objective and Context](#1-goal-objective-and-context)
2.  [Functional Requirements (MVP)](#2-functional-requirements-mvp)
3.  [Non-Functional Requirements (MVP)](#3-non-functional-requirements-mvp)
4.  [User Interaction and Design Goals](#4-user-interaction-and-design-goals)
5.  [Technical Assumptions](#5-technical-assumptions)
6.  [Core Technical Decisions & Application Structure](#6-core-technical-decisions--application-structure)
7.  [Epic Overview & Detailed User Stories](#7-epic-overview--detailed-user-stories)
    * [Epic 1: Foundational Setup & Core User Authentication](./epic1.md)
    * [Epic 2: Admin Dashboard - Core Administration & Multi-User Setup](./epic2.md)
    * [Epic 3: Core URL & Group Management with Basic Iframe Display](./epic3.md)
    * [Epic 4: Advanced Iframe Interaction & User Personalization](./epic4.md)
    * [Epic 5: Admin Dashboard - System Operations & Monitoring](./epic5.md)
8.  [Out of Scope / Future Enhancements (Post-MVP)](#8-out-of-scope--future-enhancements-post-mvp)
9.  [PM Checklist Assessment Summary](#9-pm-checklist-assessment-summary)
10. [Prompt for Design Architect (UI/UX Specification Mode)](#10-prompt-for-design-architect-uiux-specification-mode)
11. [Initial Architect Prompt](#11-initial-architect-prompt)

---

## 1. Goal, Objective and Context

* **Project Name:** ControlCenter
* **Primary Goal (MVP):**
    ControlCenter aims to provide a highly customizable and user-friendly way to manage, group, and access multiple URLs within a single browser tab using an iframe-based interface. The system will allow users to load one or many URLs simultaneously, retain their state when switching between them, and offer a seamless experience on both desktop and responsive mobile views. The core emphasis is on delivering a "nice clean modern UX look and feel" that surpasses traditional bookmarking methods in ease of use and functionality.
* **Key Objectives (MVP):**
    1.  Successfully implement the core URL management, grouping, and display features as outlined, ensuring they function intuitively and reliably.
    2.  Achieve a high level of personal satisfaction with the overall user experience, specifically regarding the "nice clean modern UX look and feel," responsiveness, and ease of managing and accessing websites.
    3.  Deliver a stable and performant application suitable for personal, everyday use.
* **Overall Context:**
    This project is primarily for personal use, aiming to create a superior alternative to traditional bookmarking for managing and interacting with multiple web resources.

---

## 2. Functional Requirements (MVP)

This section summarizes the core functionalities for the ControlCenter MVP, derived from the detailed Epics and Stories.

**I. Core Application & User Foundation:**
    * **Project Setup:** Standardized Next.js project with TypeScript, core tooling (ESLint, Prettier), version control enhancements (Husky, commitlint), and Docker containerization.
    * **Database Schema:** Prisma ORM with SQLite defining models for Users (with `isActive` status, `lastLoginAt`), User Settings (for theme and menu position preferences, with `userId` as `@id`), URLs (with required title and optional server-hosted `faviconUrl`), Groups (`name` is not globally unique), URL-in-Group relationships (with group-specific titles), User-Group Access, Activity Logs (with structured JSON details), and System Settings (for app-wide configurations like log retention). Referential actions like `onDelete: SetNull` for creator fields and `onDelete: Cascade` for join table records are defined.
    * **Authentication:**
        * User identification by unique `name` with an optional password.
        * NextAuth.js for credential-based login.
        * JWT-based session management with HTTP-only cookies.
        * Configurable session duration (default 1 week via env var) and "Remember Me" functionality (via checkbox on login forms) for extended sessions.
        * Password hashing (e.g., bcryptjs).
        * Session includes user ID, name, role, `isActive` status, and persisted theme & menu position preferences.
        * `User.lastLoginAt` updated after successful completion of initial password setup (for first run) or subsequent successful logins.
        * `User.isActive` status checked during login; inactive users cannot log in.
    * **First Run Experience (for initial Admin setup):**
        * System detects "first run" state (single default admin user: `name: "admin"`, `role: ADMIN`, `lastLoginAt: null`, and is the only user).
        * Login page conditionally offers:
            * Option to restore application state from a backup file (button present but disabled for Epic 1 MVP, with tooltip "Full restore functionality will be enabled with Admin features.").
            * Option for the default 'admin' user to log in without a password (via their user tile).
        * After first passwordless admin login, user is redirected to a mandatory password setup page (`/first-run/set-admin-password`).
            * If admin cancels password setup from this page (via a "Cancel Setup" button), they are logged out, and the system remains in "first run" state (admin `lastLoginAt` not updated).
        * "First run" state concludes (and admin `lastLoginAt` updated) only after initial admin password has been successfully set.
    * **Authorization & Access Control:**
        * Role-based access (ADMIN/USER).
        * Protected routes (e.g., `/dashboard`, `/settings/*`, `/admin/*`) via Next.js middleware.
        * Middleware checks for authentication and `User.isActive` status from session/token; redirects to login if unauthenticated or inactive.
        * Client-side proactive session validation (e.g., in root layout) checks `session.user.isActive` and logs out/redirects if false.

**II. User Interface - Global Elements & Personalization:**
    * **Application Header (AppBar - Conditional Display & Structure):**
        * Rendered on mobile (always) and on desktop/tablet if user's `menuPosition` preference is "TOP". Hidden on desktop/tablet if preference is "SIDE".
        * Displays application logo/name (from branding settings).
        * Includes a User Menu button (avatar/name) on the right, providing dropdown access to: Dashboard link, User Settings link, Admin Area link (conditional on ADMIN role), Theme Toggle (persists choice of Light/Dark/System), Logout button. (Reusable User Menu component).
        * On mobile, includes a hamburger icon on the left to toggle the main navigation drawer.
        * If "Top Menu" preference is active on desktop/tablet, AppBar has a central area for rich URL/Group navigation content (from Story 4.3).
    * **User Preferences (Persisted in `UserSetting` table):**
        * Users can set preferred desktop menu position ("Top Menu" / "Side Menu").
        * Users can set preferred theme ("Light" / "Dark" / "System" - `SYSTEM` default, falls back to `DARK` if OS pref undetectable).
        * Preferences stored via API and available in user session for immediate UI adaptation.
        * User Settings page (`/settings/profile`) provides UI for these choices with previews (static images for menu, themed boxes for theme).
        * Logic to auto-create `UserSetting` with defaults when a `User` is created.

**III. User Dashboard & URL Interaction (adapts to Menu Preference):**
    * **Personalized Content Fetching:** API endpoint (`/api/dashboard/urlGroups`) for authenticated users to fetch their accessible URL Groups and contained URLs (ordered, with effective titles, global favicons; dates as ISO strings).
    * **Desktop "Top Menu" Navigation (if preference is "TOP"):**
        * Rich, interactive "hover-to-expand" menu within the AppBar's central area.
        * Normal state: displays current group name + its horizontal URL items.
        * Hover state: expands to show other groups + their URLs.
        * Responsive for tablets (condensed, scrollable URL rows, "more" button for overflow).
    * **Desktop "Side Menu" Navigation (if preference is "SIDE"):**
        * Persistent, full-height "Side Navigation Panel" on the left (replaces AppBar on desktop/tablet).
        * Contains: App Logo/Name (top), vertical accordion-style URL/Group navigation (middle), User Menu (bottom, as accordion/links).
        * Collapsible on desktop/tablet to an icons-only view (groups show initials avatar, URLs show favicons, tooltips on hover) via a toggle button in the panel. Toggle available on full desktop.
    * **Mobile Navigation (Always Drawer-based):**
        * Hamburger icon in AppBar toggles a left-side MUI `Drawer`.
        * Drawer contains URL/Group navigation (accordion style: groups expand to show URLs, mimicking desktop Side Menu content; selected group expanded by default, state remembered during session, no internal scroll persistence).
        * Selecting a URL closes the drawer. Active URL indicator: blue right side border.
    * **URL Item Visual State Indicators (Universal in all menus):**
        * Opacity `0.5` for "non-active/non-loaded" URLs.
        * Opacity `1.0` for "non-active/loaded" URLs.
        * Opacity `1.0` + blue underline (Top Menu) or blue right border (Side Menu & Mobile Drawer) for the "active/loaded" (visible iframe) URL.
    * **Multi-Iframe Management & Display:**
        * One iframe per unique URL, kept mounted in DOM.
        * CSS `visibility: hidden` (and `position: absolute; left: -9999px;`) for inactive iframes to preserve state; `visibility: visible` for active iframe.
        * `src`/`data-src` pattern for iframe loading: `src` set from `data-src` to load; `src=""` to unload.
        * Core client-side state management (`IframeProvider`, `useIframeManager` hook) tracks active URL and loaded/unloaded status of all interacted-with iframes. Optimized React Context with `React.memo` for consumers.
        * Default iframe `sandbox` attributes: `allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox`. Top navigation by iframe content is blocked (should open new tab).
    * **Iframe Interaction:**
        * Initial dashboard load automatically loads the first URL of the first accessible group.
        * Single click on URL item: Activates it (loads if unloaded using `src` from `data-src`, makes visible). If already active & loaded, reloads its content.
        * Long press (2 seconds) on URL item: Unloads its iframe content (sets `src=""`, updates state to "unloaded"). Visual progress bar (orange, 2-3px, bottom edge of item) during press; 0.3s delay before animation. Haptic feedback on mobile.
        * If active URL is unloaded: iframe area shows centered "Content Unloaded" message + "Reload Content" button (MUI outlined with refresh icon).
    * **UI Feedback:** Broken favicons in URL lists revert to showing title prominently. Neutral UI if no groups are assigned (console log for dev). Selected group state persists during current active session (resets on full reload/new login). Main application layout fits 100% viewport height, no main scrollbars.

**IV. User Settings (Self-Service - `/settings/profile` page):**
    * Single, scrollable page with sections.
    * **Profile Info:** View read-only login `name` (styled as disabled MUI `TextField`).
    * **Password Change:** "Current Password" (if set), "New Password," "Confirm New Password." Inline error messages. MVP password complexity: minimum 4 characters.
    * **Avatar Management:** Display current avatar (or initials fallback: 1st letter of name, or 1st of first 2 words if space; background color hashed from name). "Upload/Change Avatar" (supports drag-and-drop & file select button; JPG/PNG/GIF, max 1MB). Optional preview. "Remove Avatar" option. Server-hosted in `/public/avatars/`. Old avatar file overwritten/deleted.
    * **Layout & Appearance Preferences (persisted via Story 4.1):** Menu position choice with static image previews. Theme choice with themed preview boxes (selected has blue highlight). Single "Save Layout & Appearance Preferences" button for this section. Changes apply immediately.

**V. Administrator Functions (Admin Dashboard - `/admin/*` routes):**
    * **Layout & Navigation:** Persistent Left Sidebar (fixed width, always expanded on desktop/tablet) for navigation. Main content area to the right. Common CRUD page patterns (MUI Table, green "Create" button, Edit/Delete icon buttons in actions column, forms in Dialogs).
    * **Admin Sidebar Links (Ordered):** Admin Dashboard (Overview), User Management, URL Groups, Global URLs, Application Branding, Application Settings, System Operations (B&R), System Statistics, Activity Log.
    * **User Management:** List users (name, role, avatar, `isActive` status, dates). Create new users (name, role; `passwordHash: null`, `isActive: true` default; corresponding `UserSetting` record also created with defaults). Edit users' login `name` (ensuring uniqueness). Edit users' `role` (ADMIN/USER, sole admin safeguard). Disable/Enable user accounts (`User.isActive`). Confirmation dialogs.
    * **URL Group Management (Admin UI):** Create, list (sorted `displayOrder` then `name`), update (name, desc, displayOrder), delete URL Groups. (`name` not globally unique). Confirmations.
    * **Global URL Management (Admin UI - page `/admin/global-urls`):** List global URLs. Create new global URLs (`originalUrl`, `title` req). Edit global properties. Delete global URLs. Manage global `Url.faviconUrl`: UI shows current (auto-fetched or uploaded), options to "Upload Custom Icon" (drag-and-drop + button; JPG/PNG/ICO, max 100KB; to `/public/url_favicons/`), "Re-check for Auto-Discovered Icon", "Remove Icon". Icon auto-fetch (backend Story 3.3 attempts on new/updated `originalUrl`, searches for app icons & favicons): UI displays preview & `Snackbar` on fetch failure. UI handles duplicate `originalUrl` error from API with specific message: "Error: This URL already exists as '[Existing URL Title]'...". Confirmations.
    * **Managing URLs *within* a Selected Group (Admin UI - accessed from URL Groups page):** Add existing global URLs (searchable selector). Remove from group. Reorder (`UrlInGroup.displayOrderInGroup`). Edit `UrlInGroup.groupSpecificTitle`. Confirmations.
    * **Application Branding Management:** Customize app name, upload app logo, upload app favicon (drag-and-drop + button; JPG/PNG/SVG for logo, ICO/PNG for app favicon; defined size limits). Persisted in `SystemSetting`, files in `/public/branding/`. Confirmations.
    * **Application Settings Page:**
        * **User Registration Control:** Admin can toggle system setting (`allowAdminUserCreation: Boolean @default(true)` in `SystemSetting`) to allow/disallow creation of new users by admins. Confirmation dialog.
        * **Log Retention Policy:** Admin can configure `logRetentionDays` (default 180, 0=forever; in `SystemSetting`). Confirmation dialog. UI button "Prune Logs Now" to trigger manual pruning.
    * **System Operations (Backup & Restore):**
        * **Backup:** Asynchronous API & UI to create full backup (`.zip`: SQLite DB, all assets, manifest with DB schema version & app version). UI shows "initiated" toast, manual refresh for backup list.
        * **Backup File Management:** API & UI to list existing backup files from server (name, date, size), download a backup, delete a backup (with confirmation).
        * **Restore:** Asynchronous API & UI to restore from an uploaded `.zip`. UI suggests creating fresh backup first. Stern confirmation. Handles "initiated" toast. UI shows overlay "Restore in progress... app may restart..." with refresh button enabled after a delay. Backend validates, reads manifest, restores DB then runs Prisma migrations, then restores assets (DB & migrations first for safety).
    * **System Statistics Display:** Admin dashboard section shows: Total Users, Total Groups, Total Global URLs. Data via API. Read-only. Optional refresh.
    * **User Activity Tracking Log:** `ActivityLog` Prisma model (stores timestamp, actor, action, structured `details` as JSON, target, success). Backend service logs key actions. Admin UI to view paginated activity log (reverse chronological). Details from JSON parsed/displayed. Basic client-side search on displayed data if MUI table supports easily.
    * **Automated Log Pruning:** Backend scheduled task (`node-cron`) prunes `ActivityLog` based on `logRetentionDays` policy. Pruning action itself logged to `ActivityLog`.

---

## 3. Non-Functional Requirements (MVP)

* **Performance:**
    * Application UI should load quickly ("fast initial load") and feel "snappy" during interactions.
    * Iframe loading performance is dependent on external sites but should be handled gracefully by ControlCenter (loading indicators, error messages).
* **Usability:**
    * "Nice, clean, modern UX look and feel" with "easy access" to features.
    * Intuitive navigation. Clear visual feedback for actions.
    * Desktop/tablet first design approach, with fully functional responsive mobile experience (optimized layouts, e.g., adaptive/collapsible menus).
* **Security:**
    * Standard input sanitization for all user-provided data to prevent XSS.
    * Secure session management via NextAuth.js (JWT, HTTP-only cookies).
    * Role-based access control for admin functions.
    * Backend API input validation using Zod.
    * Standard best-practice security headers for API responses where appropriate and not overly complex for MVP (e.g., via Helmet-like defaults if easy to integrate).
    * Safe filename generation for all uploaded files (e.g., using UUIDs or content hashes).
* **Reliability:**
    * High availability for home use (designed for 24/7 operation on local server).
    * Data integrity for all user data, URLs, groups, and settings.
    * Backup and restore functionality to prevent data loss.
    * Use of database transactions (Prisma `$transaction`) for multi-step database write operations.
    * Graceful error handling in UI and API.
* **Maintainability:**
    * Adherence to defined tech stack. Strict backend service layer pattern for business logic. Standardized imports for utilities.
    * Code quality following best practices (DRY, ESLint, Prettier, Conventional Commits).
    * Logical project structure and well-commented code where necessary.
* **Accessibility:**
    * Basic accessibility considerations for MVP (semantic HTML, reasonable color contrast in default themes, keyboard navigation for core MUI components).
    * Comprehensive accessibility (e.g., WCAG AA+) is a post-MVP goal.

---

## 4. User Interaction and Design Goals

* **Overall Vision & Experience:** Simple, focused, clean, uncluttered, easy to understand, modern UX. Efficient and intuitive.
* **Key Interaction Paradigms:**
    * **Dashboard URL Interaction (Epic 4):** Single-click (activate/load/reload). Long-press (2s, unload, orange 2-3px progress bar along bottom edge of item; 0.3s delay before animation starts). URL menu items show visual states (opacity 0.5 non-active/non-loaded, 1.0 non-active/loaded; opacity 1.0 + blue underline for active in Top Menu, opacity 1.0 + blue right border for active in Side Menu/Mobile Drawer). "Content Unloaded" message in iframe area with "Reload Content" button (MUI outlined with refresh icon). Haptic feedback on mobile for long-press unload.
    * **Menu Navigation (User Dashboard):**
        * Desktop: User-selectable preference (Top Menu or Side Menu) via User Settings.
            * Top Menu: `AppBar` contains `[Logo/Name (Left)] [Hover-to-expand URL/Group Navigation (Center-Left)] [User Menu Button (Right)]`. Hover-expand area shows current group + its URLs, then other groups + their URLs. Horizontal URL rows are scrollable with "more" (•••) button for overflow to dropdown on tablets.
            * Side Menu: Top `AppBar` hidden. Full-height Left Side Panel: `[Logo/Name (Top)] [Accordion URL/Group Navigation (Middle)] [User Menu (Bottom, as accordion/links)]`. Panel collapsible on desktop/tablet to icons-only (groups show initials avatar, URLs show favicons, tooltips) via toggle in panel's top section.
        * Mobile: Always a collapsible left-side MUI `Drawer` (accordion groups/URLs, active URL has blue right border, state remembered during session but not internal scroll) toggled by hamburger icon in persistent top `AppBar`.
* **Core Screens/Views (Conceptual):**
    * **Login Screen (`/login`):** Tile-based UI. User tiles (avatar/initials - 1st letter of name or 1st of 2 words, bg color hashed from name; username; password lock icon) in responsive grid. Clicking passwordless logs in. Clicking password-protected tile: inner section slides up, username moves to top, password form ("Remember Me" checkbox, login button) revealed. Clicking outside active tile reverts it. Page-level MUI `Alert` or Snackbar for login errors. During "first run," offers disabled "Restore" button and passwordless admin login path.
    * **Main Dashboard (`/dashboard`):** Primary workspace. Displays chosen navigation menu. Contains main iframe display area.
    * **User Settings (`/settings/profile`):** Single scrollable page. Sections: Profile Info (read-only login `name` as disabled field), Change Password (inline errors), Avatar Management (drag-and-drop + button for upload; JPG/PNG/GIF, max 1MB), Layout & Appearance Preferences (Menu Position choice with static image previews, Theme choice with themed preview boxes; single "Save" button for this section).
    * **Admin Area (`/admin/*`):** Persistent Left Sidebar (fixed width, always expanded desktop/tablet) for navigation. Main content area to right. CRUD pages use MUI Tables, green "Create" button, Edit/Delete icons in Actions column, forms in Dialogs.
    * **First Run Admin Password Setup Page (`/first-run/set-admin-password`):** For initial admin password set. "Cancel Setup" button reverts to first-run login state.
* **Accessibility (MVP):** Color contrast in default themes. Reasonable keyboard nav.
* **Branding (MVP):** Admin can set app name, logo, favicon. Defaults exist. Themes (Light/Dark/System) user-selectable and persisted (`SYSTEM` default, falls back to `DARK` if OS pref undetectable).
* **Target Devices:** Web app. Desktop/tablet first, responsive mobile.

---

## 5. Technical Assumptions

* **Repository & Service Architecture:** Monorepo, Monolith (Next.js full-stack).
* **Languages, Frameworks, & Libraries:** Core tech stack pre-defined (Section 6). Robust libraries like `formidable` for uploads, `archiver`/`unzipper` for zipping. Zod for API validation.
* **Starter Project:** From user's existing bootstrap.
* **Testing:** Vitest, RTL, MSW, Happy DOM, Playwright. No specific MVP test coverage %.
* **Deployment Environment:** Continuous Node.js process in Docker on a local home server (allows `node-cron`).

---

## 6. Core Technical Decisions & Application Structure

**1. Technology Stack Selections:**
* Frontend: Next.js 15.2.2 (App Router), React 19, TypeScript 5, Material UI v6, Emotion.
* Backend: Next.js API Routes, Prisma ORM v6.5.0, NextAuth.js v4, JWT, Zod for validation.
* State Management (Client): React Context/Hooks (for `IframeProvider`, `UserPreferencesProvider`, `ThemeProvider`).
* Database: SQLite with Prisma ORM.
* Testing: Vitest, RTL, MSW, Happy DOM, Playwright.
* Dev Tooling: ESLint, Prettier, Husky, Conventional Commits, Docker.
* File Handling Libraries: `formidable` (uploads), `archiver`/`unzipper` (zip).
* Scheduling: `node-cron`.

**2. Database System:** SQLite with Prisma ORM v6.5.0.

**3. Deployment and Operational Environment:** Local home server via Docker container. Uses `.env` files for environment variables.

**4. Application Directory Structure:**
    ```
    /app/               # Next.js App Router root
    ├── admin/            # Admin area pages and components (e.g., /users, /url-groups, /global-urls, /branding, /settings, /system/operations, /stats, /activity-log)
    ├── api/              # API routes (e.g., /auth, /admin/*, /user/*, /dashboard/*, /first-run/*)
    ├── components/       # Shared UI components (e.g., UserTile, IframeWrapper, AdminPageLayout, UserMenuComponent, specific menu nav components)
    ├── contexts/         # React contexts (e.g., IframeProvider, ThemeProvider, UserPreferencesProvider, SessionProvider from NextAuth)
    ├── dashboard/        # Main dashboard page (/app/dashboard/page.tsx)
    ├── lib/              # App-specific client-side utilities (e.g., hooks like useIframeManager, useLongPress; shared utils)
    ├── login/            # Authentication pages (/app/login/page.tsx)
    ├── providers/        # Root app providers wrapper component
    ├── settings/         # User settings pages (e.g., /app/settings/profile/page.tsx)
    ├── first-run/        # Pages for first-run flow (e.g., /app/first-run/set-admin-password/page.tsx)
    ├── theme/            # Theme configuration (MUI theme objects, custom theme tokens)
    ├── types/            # TypeScript type definitions (global types, API response types, Zod schemas)
    ├── layout.tsx        # Root layout component (hosts global providers, conditional AppBar/SidePanel)
    ├── page.tsx          # Root page component (e.g., redirect to login or dashboard)
    └── globals.css       # Global CSS styles

    /lib/                 # Project-level server-side or shared utilities
    ├── db/               # Prisma client instance, seeding scripts
    └── services/         # Backend services (e.g., authService, userService, groupService, urlService, backupService, restoreService, activityLogService, settingsService)
    └── auth.ts           # NextAuth.js configuration options

    /prisma/              # Prisma ORM schema and migrations
    ├── schema.prisma     # Defines User, UserSetting, Url, Group, UrlInGroup, UserGroupAccess, ActivityLog, SystemSetting models
    └── migrations/       # Database migration files

    /scripts/             # Build and utility scripts

    /public/              # Static assets
    ├── avatars/          # User uploaded avatars
    ├── url_favicons/     # Admin uploaded URL-specific favicons
    ├── branding/         # Admin uploaded app logo/favicon
    └── (other static assets like default images, menu layout previews)

    /data/                # Data storage (NOT publicly accessible, gitignored)
    ├── controlcenter.db  # SQLite database file
    ├── backups/          # Backup archives

    /__tests__/           # Test directory
    ```

**5. Repository Structure:** Monorepo.

---

## 7. Epic Overview & Detailed User Stories

**(Full detailed User Stories and Acceptance Criteria for Epics 1-5, are broken out into their own files in the same directory.)**

    * [Epic 1: Foundational Setup & Core User Authentication](./epic1.md)
    * [Epic 2: Admin Dashboard - Core Administration & Multi-User Setup](./epic2.md)
    * [Epic 3: Core URL & Group Management with Basic Iframe Display](./epic3.md)
    * [Epic 4: Advanced Iframe Interaction & User Personalization](./epic4.md)
    * [Epic 5: Admin Dashboard - System Operations & Monitoring](./epic5.md)

---

## 8. Out of Scope / Future Enhancements (Post-MVP)

* **Comprehensive Accessibility (WCAG AA+):** Beyond basic considerations, full WCAG AA+ compliance and dedicated testing is post-MVP.
* **URL Search Functionality:** The previously discussed URL search feature within navigation menus has been deferred.
* **Specific Quantitative Test Coverage Targets:** Will be defined post-MVP.
* **User Self-Management of URL Groups and Global URLs:** For MVP, only administrators can create and manage URL groups and global URLs. The ability for regular users to create and manage their own private sets is a future enhancement.
* **Sophisticated Async Backup/Restore UI Feedback:** Real-time progress beyond "initiated" toasts for asynchronous backup/restore operations (e.g., status polling, WebSockets) is post-MVP.
* **Application Version in Backup Manifest:** Currently optional/recommended in Story 5.1; full integration if complex may be deferred.
* **Advanced Admin List Filtering/Sorting:** Server-side filtering/sorting for admin tables beyond basics is post-MVP.
* **Automatic Downloading/Re-hosting of Discovered URL Icons:** Story 3.3's auto-fetch stores discovered links; a system to download, validate, and re-host these icons locally is a future enhancement.
* **Full "Between Sessions" Persistence of Minor UI States:** While core preferences (theme, menu position) and "Remember Me" sessions are persisted, finer-grained UI states like the *specifically selected group/URL* within the dashboard, or accordion states, resetting on new login is acceptable for MVP. (Story 3.9 implements selected group persistence for the *current active session*).
* **Live Application Theme Change on OS Theme Change:** Currently, "System" theme updates on reload if OS theme changes; live update without reload is post-MVP.
* **Advanced Iframe Resource Management:** Beyond manual unload (`src=""`) and keeping iframes mounted with `visibility:hidden`, strategies like an LRU cache for completely removing very old/unused iframe *elements* from the DOM are post-MVP.
* **Admin Ability to Reset User Passwords / Manage User Avatars (for other users):** Current admin user management (Story 2.3) focuses on name, role, and active status for other users. Direct password resets or avatar management for other users by an admin is deferred.
* **Public Self-Registration for Users:** The current model is admin-created users. Implementing public self-registration workflows is post-MVP.
* **Detailed Audit Log Pruning Feedback in Admin UI:** Beyond logging pruning to ActivityLog (Story 5.6), more direct UI feedback on the settings page (e.g., "Last prune: [date], X entries deleted") is a polish item.

---

## 9. PM Checklist Assessment Summary

| Category                               | Status            | Critical Issues Noted / Key Findings & Recommendations                                                                                                |
| :------------------------------------- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context        | PASS              | None. Well-defined for a personal project.                                                                                                          |
| 2. MVP Scope Definition                | PASS              | "Out of Scope / Future Enhancements" section (Section 8 above) now explicitly populated.                                                          |
| 3. User Experience Requirements        | PARTIAL           | No separate formal User Journey diagrams created; flows embedded in highly detailed stories and refined via Design Architect session (acceptable).    |
| 4. Functional Requirements             | PARTIAL           | Explicit CLI-based local testability for backend services not formally part of ACs; dev relies on API/unit tests.                                     |
| 5. Non-Functional Requirements         | PASS              | Well-contextualized for a personal project. Architectural decisions (Zod, Service Layer, Transactions, Secure File Handling) enhance robustness.      |
| 6. Epic & Story Structure              | PASS              | Clear Epics and detailed stories with ACs.                                                                                                          |
| 7. Technical Guidance                  | PASS              | "Very Technical" workflow and Architect review have integrated much of this into requirements directly.                                               |
| 8. Cross-Functional Requirements       | PASS              | Data schemas, operational needs (backup/restore, logging) well-defined.                                                                             |
| 9. Clarity & Communication             | PASS              | Iterative process with PM, Design Architect, and Architect ensured clarity. Final document should be enhanced with system diagrams if possible (post this generation). |

**Key Findings & Recommendations from PM Checklist (Addressed or Noted):**
* **Formalize "Out of Scope":** Addressed in Section 8.
* **User Journeys:** Reliance on detailed stories and Design/Architect input is acceptable.
* **Backend CLI Testability:** Not a primary focus for ACs.
* **Admin UI List Mgt.:** Basic sorting/pagination for MVP is acceptable.
* **Icon Auto-Fetch:** "Best-effort" with manual override and UI feedback is the strategy.
* **Async B/R UI Feedback:** MVP uses initiation toasts and defined UI patterns (refresh, overlay).
* **App Version in Backup:** Optional status remains.

**Overall PRD Readiness:** READY FOR DEVELOPMENT.

---

## 10. Prompt for Design Architect (UI/UX Specification Mode)

**(This phase was completed. Key UI/UX decisions from the Design Architect (Jane) session have been integrated into the detailed User Stories and relevant PRD sections like "User Interaction and Design Goals" and "Functional Requirements.")**

**Original Prompt (for historical reference):**
*Objective:** Elaborate on the UI/UX aspects of the product defined in this PRD for ControlCenter.
*(Full prompt details available in prior dialogue history)*

---

## 11. Initial Architect Prompt

**(This phase was completed. Key architectural decisions from the Architect (Alex) session have been integrated into relevant PRD sections like "Non-Functional Requirements," "Technical Assumptions," "Core Technical Decisions & Application Structure," and as guiding principles for story implementation.)**

**Original Prompt (for historical reference):**
Based on the comprehensive requirements detailed in this Product Requirements Document for the **ControlCenter** project, the following technical guidance, decisions, and assumptions should inform your architecture analysis and design when operating in "Architecture Creation Mode":
*(Full prompt details available in prior dialogue history)*
