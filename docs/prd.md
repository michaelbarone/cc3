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
    * [Epic 1: Foundational Setup & Core User Authentication](#epic-1-foundational-setup--core-user-authentication)
    * [Epic 2: Admin Dashboard - Core Administration & Multi-User Setup](#epic-2-admin-dashboard---core-administration--multi-user-setup)
    * [Epic 3: Core URL & Group Management with Basic Iframe Display](#epic-3-core-url--group-management-with-basic-iframe-display)
    * [Epic 4: Advanced Iframe Interaction & User Personalization](#epic-4-advanced-iframe-interaction--user-personalization)
    * [Epic 5: Admin Dashboard - System Operations & Monitoring](#epic-5-admin-dashboard---system-operations--monitoring)
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
    * **Password Change:** "Current Password" (if set), "New Password," "Confirm New Password." Inline error messages. MVP password complexity: minimum 8 characters.
    * **Avatar Management:** Display current avatar (or initials fallback: 1st letter of name, or 1st of first 2 words if space; background color hashed from name). "Upload/Change Avatar" (supports drag-and-drop & file select button; JPG/PNG/GIF, max 1MB). Optional preview. "Remove Avatar" option. Server-hosted in `/public/avatars/`. Old avatar file overwritten/deleted.
    * **Layout & Appearance Preferences (persisted via Story 4.1):** Menu position choice with static image previews. Theme choice with themed preview boxes (selected has blue highlight). Single "Save Layout & Appearance Preferences" button for this section. Changes apply immediately.

**V. Administrator Functions (Admin Dashboard - `/admin/*` routes):**
    * **Layout & Navigation:** Persistent Left Sidebar (fixed width, always expanded on desktop/tablet) for navigation. Main content area to the right. Common CRUD page patterns (MUI Table, green "Create" button, Edit/Delete icon buttons in actions column, forms in Dialogs).
    * **Admin Sidebar Links (Ordered):** Admin Dashboard (Overview), User Management, URL Groups, Global URLs, Application Branding, Application Settings, System Operations (B&R), System Statistics, Activity Log.
    * **User Management:** List users (name, role, avatar, `isActive` status, dates). Create new users (name, role; `passwordHash: null`, `isActive: true` default; corresponding `UserSetting` record also created with defaults). Edit users' login `name` (ensuring uniqueness). Edit users' `role` (ADMIN/USER, sole admin safeguard). Disable/Enable user accounts (`User.isActive`). Confirmation dialogs.
    * **URL Group Management (Admin UI):** Create, list (sorted `displayOrder` then `name`), update (name, desc, displayOrder), delete URL Groups. (Names are not globally unique). Confirmations.
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
    * Safe filename generation for all uploaded files.
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
* **Branding (MVP):** Admin can set app name, logo, favicon. Defaults exist. Themes (Light/Dark/System) user-selectable and persisted.
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

This section contains the full definition of all Epics and their constituent User Stories, including detailed Acceptance Criteria, for the ControlCenter MVP 1.0.

---
### Epic 1: Foundational Setup & Core User Authentication
**Goal:** Establish the initial project structure, database schema for users (including `isActive` status and `lastLoginAt`), implement robust user authentication for the initial admin (including the defined "First Run" experience with conditional login options and mandatory password setup), secure basic application access via middleware (checking `isActive`), and implement client-side session validation for `isActive` status.

* **Story 1.1: Initialize Next.js Project with Core Tooling**
    * **As a** Developer/System Maintainer,
    * **I want** to ensure the foundational Next.js application is correctly set up using the pre-defined tech stack (Next.js 15.2.2, TypeScript 5), including essential development tools (ESLint v9, Prettier), version control enhancements (Husky, commitlint), and basic Docker containerization,
    * **So that** we have a runnable, linted, formatted, and containerizable application skeleton, confirming the existing bootstrapped repository meets these standards and provides a consistent development environment for ControlCenter.
    * **Acceptance Criteria:**
        * `[ ]` The existing bootstrapped Next.js (version 15.2.2) project utilizes the App Router.
        * `[ ]` The project successfully starts in development mode (e.g., via `npm run dev` or `yarn dev`) without errors.
        * `[ ]` The project's root directory structure aligns with the agreed-upon layout (including stubs for `/app`, `/lib`, `/prisma`, `/scripts`, `/public`, `/data`, `/__tests__`).
        * `[ ]` TypeScript (version 5) is correctly configured and integrated into the project.
        * `[ ]` The project compiles successfully using the TypeScript compiler (e.g., as part of `npm run build` or `yarn build`) without emitting TypeScript errors.
        * `[ ]` A `tsconfig.json` file is present and includes appropriate settings for a Next.js project (e.g., `strict: true`, `jsx: "preserve"`, `esModuleInterop: true`).
        * `[ ]` ESLint (version 9) is installed and configured with relevant plugins for TypeScript and Next.js (e.g., `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-next`).
        * `[ ]` An ESLint configuration file (e.g., `.eslintrc.js`, `.eslintrc.json`) is present and defines a base set of rules.
        * `[ ]` Prettier is installed and configured for consistent code formatting.
        * `[ ]` A Prettier configuration file (e.g., `.prettierrc.json`, `prettier.config.js`) is present.
        * `[ ]` NPM/Yarn scripts (e.g., `lint`, `format`) are available and successfully run ESLint and Prettier respectively across the codebase, reporting no errors on the initial setup.
        * `[ ]` Husky is installed and configured to manage git hooks.
        * `[ ]` A pre-commit hook is successfully set up via Husky, triggering ESLint and Prettier checks/fixes on staged files before a commit is made.
        * `[ ]` `commitlint` is installed and configured with `@commitlint/config-conventional` to enforce Conventional Commits standards for commit messages.
        * `[ ]` A `commitlint.config.js` (or equivalent) file is present.
        * `[ ]` A `Dockerfile` is present in the project root, capable of building a production-ready, runnable Docker image of the Next.js application.
        * `[ ]` A `.dockerignore` file is present and correctly configured to exclude unnecessary files and directories (e.g., `node_modules`, `.git`, local `.env` files, `.next` build cache unless using multi-stage builds effectively).
        * `[ ]` A `README.md` file exists at the project root, containing the project name ("ControlCenter") and basic instructions for developers on how to set up the development environment, run the application locally, and execute linters/formatters.

* **Story 1.2: Integrate Prisma ORM and Define Initial User Schema**
    * **As a** Developer/System,
    * **I want** to integrate Prisma ORM (v6.5.0) into the Next.js project, configure it to use an SQLite database, and define the initial `User` schema including `name` as identifier, optional passwords, a `lastLoginAt` field, an `isActive` status flag, and appropriate referential actions (`onDelete: SetNull`) for relations to `Url` and `Group` creator fields.
    * **So that** the application has robust data persistence for users, supporting authentication, activity tracking, account status management, and maintains integrity if creator users are deleted.
    * **Acceptance Criteria:**
        * `[ ]` Prisma CLI (compatible with v6.5.0) is installed as a project development dependency.
        * `[ ]` Prisma Client (compatible with v6.5.0) is installed as a project dependency.
        * `[ ]` Prisma is initialized within the project (e.g., via `npx prisma init`), creating the `/prisma` directory and a base `schema.prisma` file.
        * `[ ]` The `datasource db` block in `prisma/schema.prisma` is configured with `provider = "sqlite"`.
        * `[ ]` The `url` for the datasource is correctly set to point to an SQLite database file located at `/data/controlcenter.db` (e.g., `url = "file:../data/controlcenter.db"` if schema is in `/prisma`, or configured via an environment variable like `DATABASE_URL=file:./data/controlcenter.db` in `.env`).
        * `[ ]` The `/data` directory exists at the project root.
        * `[ ]` A `User` model is defined in `prisma/schema.prisma` with fields: `id` (String, `@id @default(cuid())`), `name` (String, `@unique`), `passwordHash` (String, Optional `?`), `avatarUrl` (String, Optional `?`), `role` (`UserRole` enum: USER, ADMIN; `@default(USER)`), `lastLoginAt` (DateTime, Optional `?`), `isActive` (Boolean, `@default(true)`), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`).
        * `[ ]` The `User` model includes relation fields: `settings UserSetting?`, `addedUrls Url[] @relation("AddedUrls")`, `createdGroups Group[] @relation("CreatedGroups")`, `groupAccesses UserGroupAccess[]`, `activityLogs ActivityLog[] @relation("UserActivityLogs")`.
        * `[ ]` A `UserRole` enum (`USER`, `ADMIN`) is defined.
        * `[ ]` A Prisma migration is successfully generated based on the defined `User` model and any other initial models (like `UserSetting` if its creation is tied here).
        * `[ ]` This migration, when applied (e.g., via `npx prisma migrate dev`), successfully creates/alters the `User` table (and `UserRole` enum) in the SQLite database.
        * `[ ]` The generated migration file(s) are present in the `/prisma/migrations` directory.
        * `[ ]` Prisma Client is successfully (re)generated and is usable within the application code.
        * `[ ]` Basic CRUD (Create, Read, Update, Delete) operations on the `User` table, including interaction with `isActive` and `lastLoginAt` fields, are functional (verified via a test script or simple API route).
        * `[ ]` A mechanism is established to seed a default 'admin' user (`name: "admin"`, `role: ADMIN`, `isActive: true`, `lastLoginAt: null`) into the database if one doesn't already exist. This seeding process also creates a corresponding default `UserSetting` record for this admin user (as per Story 4.1 requirements).

* **Story 1.3: Implement NextAuth.js for Core Authentication Logic**
    * **As a** Developer/System,
    * **I want** to integrate and configure NextAuth.js (v4) to handle user authentication using the `name` field and an optional password, check for account `isActive` status, leverage the Prisma adapter, establish JWT-based session management with HTTP-only cookies, support configurable session durations, include "Remember Me" functionality, and include the `isActive` status and user preferences (theme, menuPosition from Story 4.1) in the session.
    * **So that** ControlCenter has a secure, robust, and flexible core mechanism for authenticating users and managing their sessions, ensuring only active accounts can log in and maintain sessions, and user preferences are readily available.
    * **Acceptance Criteria:**
        * `[ ]` The `next-auth` package (version 4.x) and the `@next-auth/prisma-adapter` are installed as project dependencies.
        * `[ ]` The NextAuth.js dynamic API route (e.g., `/app/api/auth/[...nextauth].ts`) is created and correctly configured.
        * `[ ]` Essential NextAuth.js global options are configured in the API route, including: `secret` (obtained from an environment variable `NEXTAUTH_SECRET`) and the `session` strategy explicitly set to `jwt`.
        * `[ ]` The `@next-auth/prisma-adapter` is correctly configured and passed to the NextAuth.js options, linking it to the initialized Prisma Client instance.
        * `[ ]` A `Credentials` provider is added to the NextAuth.js configuration.
        * `[ ]` The `authorize` function within the Credentials provider is implemented to:
            * Accept `name` (String) and `password` (String, which can be empty or undefined) as inputs.
            * Query the database (via Prisma) for a user with the provided `name`.
            * If a user is found, verify `User.isActive` is `true`. If `false`, authentication fails (returns `null`).
            * If `isActive` is `true`:
                * If the user's `passwordHash` field is populated, securely compare the provided password with the stored `passwordHash` (e.g., using `bcrypt.compare()`). A match results in success.
                * If `User.passwordHash` is null (and provided password is also empty/null), consider this a successful authentication (for passwordless users or initial admin setup).
            * If authentication is successful, return a user object containing at least `id`, `name`, `role`, `isActive`, and any fields from the related `UserSetting` record (like `theme`, `menuPosition`).
            * If authentication fails, return `null`.
        * `[ ]` JWT strategy callbacks (`jwt`, `session`) are configured:
            * The `jwt` callback includes `id`, `name`, `role`, `isActive` status, `theme`, and `menuPosition` in the JWT payload.
            * The `session` callback exposes these details (e.g., `session.user.id`, `name`, `role`, `isActive`, `theme`, `menuPosition`) to the client-side session object.
            * The `jwt` callback logic considers a "Remember Me" flag (passed from login) to influence session/token expiry if custom logic beyond cookie `maxAge` is used for JWTs themselves.
        * `[ ]` Session cookies generated by NextAuth.js are configured to be HTTP-only. Default session maximum age is set to 1 week (configurable via `NEXTAUTH_SESSION_MAX_AGE_SECONDS` environment variable).
        * `[ ]` If "Remember Me" functionality is activated during login, the session cookie's `maxAge` is extended to a longer period (e.g., 30 days, configurable via `NEXTAUTH_REMEMBER_ME_MAX_AGE_SECONDS` environment variable).
        * `[ ]` A secure password hashing library (e.g., `bcryptjs`) is integrated and used for comparing hashed passwords by the `authorize` function.
        * `[ ]` Developers can verify the authentication flow: successful login for an `isActive: true` user returns appropriate session cookies with configured `maxAge`; login attempt for `isActive: false` user is rejected.
        * `[ ]` Client-side `useSession()` hook correctly retrieves session data including `user.isActive`, `theme`, and `menuPosition`.
        * `[ ]` Upon successful login (and completion of any first-run password setup for new admins), the `User.lastLoginAt` field for the authenticated user is updated with the current timestamp in the database.

* **Story 1.3.5: Create API Endpoint to List User Tiles**
    * **As the** Login Page,
    * **I want** to fetch a list of user profiles, formatted specifically for display as interactive login tiles (including username, avatar, password requirement status, admin status, and last login time), ordered by user creation date by default, with dates provided as ISO 8601 strings in the JSON response.
    * **So that** I can present users with a visual, intuitive, and consistently ordered way to select their profile and initiate the login process, and the frontend can format dates as needed for display.
    * **Acceptance Criteria:**
        * `[ ]` A new Next.js API route is created at `/app/api/auth/user-tiles/route.ts` (or similar) that handles HTTP GET requests.
        * `[ ]` The endpoint fetches all `User` records from the database using Prisma, ordered by their `createdAt` field in ascending order ("newest created users appear last" in the list).
        * `[ ]` Each fetched `User` record is transformed into a `UserTile` object with the following structure:
            ````typescript
            interface UserTile {
              id: string;
              username: string;        // Mapped from User.name
              avatarUrl: string | null;  // Mapped from User.avatarUrl
              requiresPassword: boolean; // true if User.passwordHash is not null and not empty, else false
              isAdmin: boolean;        // true if User.role is 'ADMIN', else false
              lastLoginAt?: string;   // Mapped from User.lastLoginAt, serialized to ISO 8601 string if set
            }
            ````
        * `[ ]` The API endpoint returns a JSON array of `UserTile` objects with an HTTP 200 OK status upon successful retrieval.
        * `[ ]` If no users are found in the database, the endpoint returns an empty JSON array (`[]`) with an HTTP 200 OK status.
        * `[ ]` In case of a database error or other server-side issue, the endpoint returns an appropriate HTTP 500 Internal Server Error status with a JSON error message.
        * `[ ]` For the MVP, this API endpoint is publicly accessible (does not require prior authentication).

* **Story 1.4: Develop Rich Interactive Tile-Based Login Page UI**
    * **As an** End User,
    * **I want** to interact with a visually distinct, tile-based login page where user profiles (fetched from API) are displayed as interactive tiles. Clicking a passwordless user tile logs me in immediately. Clicking a password-protected user tile smoothly transforms the tile (inner section slides up, username moves to top) to reveal an in-tile password form (which I can cancel by clicking outside the active tile). I also want a "Remember Me" option. Error messages are page-level. Avatar fallbacks use initials with hashed background colors.
    * **So that** I can securely log into the application using a visually appealing, animated, and intuitive interface.
    * **Acceptance Criteria:**
        * `[ ]` (Page Implementation & Routing) Login page at `/login`. Authenticated users redirected to `/dashboard`.
        * `[ ]` (UI Layout & Styling) Displays user tiles (from Story 1.3.5 API) in a responsive grid (MUI `Grid`: 4/row desktop, 2/tablet, 1/mobile). Uses MUI v6, clean/modern/themed, fully responsive.
        * `[ ]` (Individual User Tile Visuals) Tile is card-like (MUI `Card`/custom) with elevation. Initial state: `UserTile.username` middle-center. Displays avatar (if `UserTile.avatarUrl`, else initials fallback: 1st letter of `username`, or 1st of 2 words if space; background color hashed from `username`). Optional avatar as tile background. Lock icon if `UserTile.requiresPassword` is true. Gradient overlay.
        * `[ ]` (User Tile Interaction & Transformation) Hover: slight elevation. Focus states. Clicking password-protected tile: inner section slides upward, `username` moves to top, password form elements revealed. Clicking outside active transformed tile reverts it to initial state.
        * `[ ]` (In-Tile Password Form Elements) For transformed password-protected tile: MUI `TextField` for password, "Login" MUI `Button`, password visibility toggle, "Remember Me" MUI `Checkbox`.
        * `[ ]` (Client-Side Auth Logic) Clicking passwordless tile: immediate `signIn()` (username, "Remember Me" state). Submitting in-tile password form: `signIn()` (username, password, "Remember Me" state). Redirect to `/dashboard` on success. Client-side validation (name for passwordless, password for form).
        * `[ ]` (User Feedback & Error Handling) Loading indicator (e.g., on tile/button) during `signIn`. If `signIn` fails: generic, page-level MUI `Alert` (e.g., top/bottom of page or Snackbar/Toast) with "Invalid name or password." On failed in-tile form login, tile might revert to initial state (or error shown near tile if page-level alert is too disconnected - to be refined based on UX feel).
        * `[ ]` (Accessibility & Animations) Keyboard nav for tiles (arrow keys, grid aware), tiles activatable (`Enter`/`Space`). Focus moves to password field. In-tile form keyboard accessible. `Escape` in form cancels, reverts tile. ARIA labels/roles. Smooth animations (300ms) for hover, selection, slide-up.
        * `[ ]` (Integration with Story 1.5) Structured for conditional UI for "First Run".

* **Story 1.5: Implement "First Run" Experience on Login Page**
    * **As an** Initial Administrator,
    * **I want** to be presented with special options on the tile-based login page when the application is in a "first run" state (defined by a single default admin user existing who has never logged in). This should allow me to either see a (currently disabled for Epic 1) option to restore from backup, or to log in as the default 'admin' without a password. This passwordless login must then direct me to a mandatory password setup page. If I cancel this password setup (via a "Cancel Setup" button), the application should remain in the "first run" state for subsequent login attempts (admin `lastLoginAt` not updated until password set).
    * **So that** I can easily and securely perform the initial setup of the ControlCenter application, establish the primary admin credentials, and have the option to restart the setup if needed.
    * **Acceptance Criteria:**
        * `[ ]` (First Run State Determination) Login page determines "first run" status (server-side: exactly one `User`, `name=="admin"`, `role==ADMIN`, `User.lastLoginAt==null`). Status in page state.
        * `[ ]` (Conditional UI for "Restore from Backup") If "first run": "Restore System from Backup" MUI `Button` displayed, **disabled**. Tooltip: "Full restore functionality will be enabled with Admin features."
        * `[ ]` (Conditional UI & Interaction for 'Admin' Tile) If "first run": 'admin' user tile distinct/highlighted. Clicking it presents "Login & Setup Admin Account" option (bypasses password form).
        * `[ ]` (Passwordless Admin Login Process) Activating "Login & Setup" calls `signIn()` for 'admin' (passwordless). `authorize` (Story 1.3) allows if backend confirms first run (`User.lastLoginAt` is null). Session established. `User.lastLoginAt` for admin is **NOT yet updated**.
        * `[ ]` (Mandatory Admin Password Setup Page & Flow) After passwordless login, redirect to `/first-run/set-admin-password`. Page indicates mandatory setup. Form: "New Password," "Confirm New Password" (MUI `TextFields`, masked, client validation: match & min 8 chars). "Set Password" & "Cancel Setup" MUI `Buttons`.
            * Submitting "Set Password": `POST /api/first-run/set-admin-password`. Backend verifies first-run admin state, hashes new password, updates `User.passwordHash`, **updates `User.lastLoginAt`**. Redirect to `/dashboard` on success. Success/error messages.
            * Clicking "Cancel Setup": Current session terminated (`signOut()`). Redirect to `/login`. `User.lastLoginAt` remains null. System stays in "first run".
        * `[ ]` Access to other app parts from `/first-run/set-admin-password` restricted until password set or setup cancelled.
        * `[ ]` (Conclusion of "First Run" UI State) After admin password successfully set (`User.lastLoginAt` updated, `passwordHash` set), subsequent visits to `/login` no longer show "first run" UI. 'Admin' tile prompts for the newly set password.

* **Story 1.6: Implement Basic Protected Routes, Middleware, and Client-Side Session Validation**
    * **As the** System,
    * **I want** to secure specific application routes using Next.js middleware that checks user session status and account `isActive` state, and implement a client-side mechanism (e.g., in root layout) to proactively validate session activity by checking `session.user.isActive` and logging out if false.
    * **So that** sensitive application content is protected, only active users can maintain access, and the user experience is responsive to changes in account status.
    * **Acceptance Criteria:**
        * `[ ]` (Middleware Implementation) Next.js middleware file created. `matcher` configured for protected routes (e.g., `['/dashboard/:path*', '/settings/:path*', '/admin/:path*']`).
        * `[ ]` (Session & Account Status Checking in Middleware) Middleware retrieves session/token. Verifies user authenticated AND `token.isActive === true`.
        * `[ ]` (Redirection) If unauth or `token.isActive === false`, redirect to `/login` with `callbackUrl`.
        * `[ ]` (Access for Authenticated & Active Users) If auth and `token.isActive === true`, request proceeds.
        * `[ ]` (Exclusion of Public/Auth Routes) `/login`, `/api/auth/**`, `/api/auth/user-tiles` not blocked.
        * `[ ]` (Client-Side Proactive Session Validation) Logic in global client component (e.g., root `layout.tsx`): uses `useSession()`. On load/triggers, checks `session.user.isActive`. If `false` while authenticated, calls `signOut({ callbackUrl: '/login' })`.
        * `[ ]` (Role-Based Auth Note) Code comment for future role-based checks in middleware.
        * `[ ]` (Verification) Manual/automated tests confirm redirection/access based on auth and `isActive`. Client-side proactive logout verified.

---
### Epic 2: Admin Dashboard - Core Administration & Multi-User Setup
**Goal:** Provide administrators with tools to manage essential application settings (branding), control user registration, create and manage other user accounts (defining admin/user roles, including disabling accounts), and enable all users (including the initial admin) to manage their own profiles (avatar support). This establishes core administrative functions and enables multi-user scenarios.

* **Story 2.1:** Create Basic Admin Dashboard Layout and Navigation
    * **As an** Administrator, **I want** to access a dedicated and secure `/admin` section with a persistent Left Sidebar (fixed width, always expanded on desktop/tablet) containing direct links to all key admin functions in a defined order, and a main content area for these functions. **So that** I have a clear, organized, and protected entry point for all administrative tasks.
    * **Acceptance Criteria:**
        * `[ ]` (Admin Route Protection) `/admin/*` routes require `ADMIN` role. `USER` role redirected to `/dashboard` (with "Not Authorized" message). Unauth to `/login`.
        * `[ ]` (Admin Dashboard Layout) Dedicated layout `/app/admin/layout.tsx` using MUI. Persistent Left Sidebar (fixed width, always expanded on desktop/tablet, not mobile-optimized for admin itself). Main content area to the right. Responsive content area.
        * `[ ]` (Admin Navigation Sidebar) Left Sidebar displays direct links in defined order: Admin Dashboard (Overview), User Management, URL Groups, Global URLs, Application Branding, Application Settings, System Operations (B&R), System Statistics, Activity Log.
        * `[ ]` Clicking links navigates to respective admin pages (can be placeholder "Coming Soon" pages within admin layout initially for sections built in later stories). Active section visually indicated.
        * `[ ]` (Admin Area Landing Page) Base `/admin` route (`/app/admin/page.tsx`) renders basic landing page (e.g., "ControlCenter Administration") using admin layout.
        * `[ ]` (Visual Consistency) Clean, professional, uses app themes.

* **Story 2.2:** Implement User Profile Management (Self-Service)
    * **As an** Authenticated User (including Administrators viewing their own profile),
    * **I want** to be able to view my profile information (including my read-only login name as a disabled field), update my password (with inline error messages, min 8 char MVP complexity), and upload (with drag-and-drop support and file select button; JPG/PNG/GIF, max 1MB; optional preview) or remove my avatar image.
    * **So that** I can personalize my account and maintain its security.
    * **Acceptance Criteria:**
        * `[ ]` (Profile Page UI & Access) "/settings/profile" page, protected. Only current user access. Displays read-only login `name` (disabled MUI `TextField`), current avatar (MUI `Avatar` or initials fallback: 1st letter of name or 1st of 2 words, bg color hashed from name). MUI, responsive, themed.
        * `[ ]` (Password Change) "Change Password" section. MUI `TextFields` for "Current Password" (if set), "New Password", "Confirm New Password" (masked, visibility toggle). Client validation: new passwords match, min 8 chars. Inline error messages. Submit calls `POST /api/user/profile/change-password`. Backend verifies current password (if set/provided), hashes new, updates `User.passwordHash`. Success/error `Snackbar`/`Alert`.
        * `[ ]` (Avatar Upload & Management) Displays current avatar. "Upload/Change Avatar" MUI `Button` triggers file input AND a designated area supports drag-and-drop for image files (`image/jpeg`, `image/png`, `image/gif`). Client validation (type, max 1MB). Optional preview. Confirm upload calls `POST /api/user/profile/avatar` (FormData). Backend validates, saves to `/public/avatars/[userId].[ext]` (overwrites old), updates `User.avatarUrl`. UI updates, session `avatarUrl` updates. "Remove Avatar" button calls `DELETE /api/user/profile/avatar`, sets `User.avatarUrl` to null, deletes server file, UI shows fallback.
        * `[ ]` (Backend API Endpoints) Secure APIs under `/api/user/profile/` for change password, upload/remove avatar. User-specific operations only. Validation, success/error JSON responses.

* **Story 2.3:** Implement Admin User Management (List, Create, Edit Roles/Names, Disable/Enable Accounts)
    * **As an** Administrator,
    * **I want** a UI to list all users (showing name, role, avatar, `isActive` status, dates), create new users (name, role; `passwordHash: null`, `isActive: true` default; `UserSetting` also created), edit existing users' login `name` (unique) and `role` (sole admin safeguard), and disable/enable user accounts (`User.isActive`), all with confirmation dialogs.
    * **So that** I can manage the user base, credentials, permissions, and account status.
    * **Acceptance Criteria:**
        * `[ ]` (User Management Page) `/admin/users` page, admin layout, `ADMIN` role only.
        * `[ ]` (User List Display) MUI `Table`/`List` of all users: `id`, login `name`, `role`, avatar (or fallback), `lastLoginAt` (formatted), `createdAt` (formatted), `isActive` status ("Active"/"Disabled" or MUI `Chip`). No pagination for MVP. Optional client/server sort.
        * `[ ]` (Create New User) Prominent green/success MUI `Button` "Create New User" opens `Dialog`/form. Fields: `name` (required), `role` (USER/ADMIN, default USER). No password field. Client validation for `name`. Confirmation dialog: "Are you sure... create user '[name]' role '[role]'? Passwordless initially." On confirm, `POST /api/admin/users`. Backend: verifies admin, unique `name`, creates `User` (`passwordHash: null`, `isActive: true`) and default `UserSetting` record. List updates. Success/error `Snackbar`.
        * `[ ]` (Edit User `name`) "Edit" action per user. Modal/form pre-filled. Admin edits `name`. Client validation. Confirmation dialog: "Are you sure... change login name for '[current_name]' to '[new_name]'?". On confirm, `PUT /api/admin/users/[userId]`. Backend: verifies admin, unique new `name` (if changed). Updates `User.name`. List updates. Success/error messages. Feedback about login name change.
        * `[ ]` (Edit User `role`) In same "Edit" modal/form, admin changes `role`. Confirmation: "Are you sure... change role for '[name]' to '[new_role]'?". On confirm, `PUT /api/admin/users/[userId]`. Backend: verifies admin. Safeguard: admin cannot change own role to `USER` if sole active `ADMIN`. Updates `User.role`. List updates. Success/error.
        * `[ ]` (Disable/Enable User Account) In "Edit" modal or list row (MUI `Switch` or `IconButton` "Disable"/"Enable"). UI reflects `isActive`. Confirmation: "Are you sure... [disable/enable] account for '[name]'?". On confirm, `PUT /api/admin/users/[userId]` (updates `isActive`). Backend: verifies admin. Safeguard: admin cannot disable own account if sole active `ADMIN`. Updates `User.isActive`. List updates. Success/error.
        * `[ ]` (Backend API Endpoints) Secure APIs under `/api/admin/users`: `GET /` (list users, incl. `isActive`), `POST /` (create: name, role; `passwordHash: null`, `isActive: true`, create UserSetting), `PUT /[userId]` (update name, role, `isActive`). Admin only, validations, safeguards.

* **Story 2.4:** Implement Application Branding Management (Revised with Confirmation Dialogs)
    * **As an** Administrator,
    * **I want** to be able to customize the application's displayed name, upload (drag-and-drop + button) a custom logo image (JPG/PNG/SVG), and upload (drag-and-drop + button) a custom favicon image (ICO/PNG) through the admin dashboard, with confirmations before changes are applied.
    * **So that** I can personalize the appearance of my ControlCenter instance.
    * **Acceptance Criteria:**
        * `[ ]` (Branding Management Page) `/admin/branding` page, admin layout, `ADMIN` role only. Displays current branding, forms/inputs to change.
        * `[ ]` (Application Name Customization)* MUI `TextField` for "Application Name", pre-filled. General "Save Branding Settings" button. Confirmation dialog: "Are you sure... update branding settings?". On confirm, API saves name (persisted in `SystemSetting` table). Success message. App name (title/header) dynamically updates.
        * `[ ]` (Logo Image Upload)* "Application Logo" section shows current logo/placeholder. "Upload New Logo" (drag-and-drop zone + button; JPG/PNG/SVG, max 1MB defined limit). Client validation. Optional preview. Saving branding triggers API upload. Backend validates, saves to `/public/branding/logo.[ext]` (overwrites), stores path in `SystemSetting`. UI/app logo updates. "Remove Custom Logo" option (with confirmation) reverts to default.
        * `[ ]` (Favicon Image Upload)* "Application Favicon" section. "Upload New Favicon" (drag-and-drop zone + button; ICO/PNG, defined dimensions e.g. 32x32, size e.g. max 100KB). Client validation. Saving branding triggers API upload. Backend validates, saves to `/public/favicon.ico` (or similar), stores path/flag in `SystemSetting`. Browser favicon updates (may need hard refresh). "Remove Custom Favicon" option (with confirmation) reverts to default.
        * `[ ]` (Persistence & Application)* Branding settings (App Name, Logo path, Favicon path) in `SystemSetting` model. Defaults used if not set. App layout dynamically uses settings for `<title>`, `<link rel="icon">`.
        * `[ ]` (Backend API Endpoints)* Secure APIs under `/api/admin/branding`: `GET /` (get settings), `POST /` or `PUT /` (update text settings, save paths, handle deletions), separate `POST` for file uploads. Admin only, validations.

* **Story 2.5:** Implement User Registration Control Setting (Finalized with Confirmation)
    * **As an** Administrator,
    * **I want** to be able to enable or disable the ability for new user accounts to be created by an administrator within the application via a setting in the admin dashboard, with a confirmation before the change is applied. (Default: ENABLED).
    * **So that** I have clear control over the expansion of the user base and can prevent new user additions (even by other admins) when not desired.
    * **Acceptance Criteria:**
        * `[ ]` (Registration Control UI)* Section in admin settings page (e.g. `/admin/settings`). `ADMIN` role only. Displays current state. MUI `Switch` "Allow New User Creation by Admins."
        * `[ ]` (Persistence, Retrieval, Confirmation)* Setting state (`allowAdminUserCreation: Boolean @default(true)`) in `SystemSetting` model. Toggle change -> Confirmation dialog: "Are you sure... [enable/disable] new user creation by admins?". On confirm, API saves. Success `Snackbar`. Setting fetched/displayed correctly.
        * `[ ]` (Effect of Setting)* If disabled: "Create New User" button (Story 2.3) hidden/disabled; backend API (`POST /api/admin/users`) rejects creation. If enabled: functionality active.
        * `[ ]` (Default State)* "Allow New User Creation by Admins" is **ENABLED** by default.
        * `[ ]` (Backend API)* System settings API (`GET /api/admin/settings`, `PUT /api/admin/settings`) extended for this boolean setting. Admin only.

## 7. Epic Overview & Detailed User Stories

This section contains the full definition of Epics 3, 4, and 5, and their constituent User Stories, including detailed Acceptance Criteria, for the ControlCenter MVP 1.0. *(Epics 1 and 2 would precede this section in a complete document, with their full details as well).*

---
### Epic 3: Core URL & Group Management with Basic Iframe Display
**Goal:** Enable administrators to create, manage, and organize URLs (with required titles, optional server-hosted favicons including auto-discovery attempts) and URL Groups (`name` not globally unique). Enable all authenticated users to view groups/URLs assigned to them. Implement basic functionality to display a selected URL in an iframe (with opacity/underline/border indicators for URL items and refined display logic for broken favicons, empty states), using a default desktop top-menu and mobile drawer navigation, and multi-iframe handling with `visibility:hidden` for state preservation.

* **Story 3.1: Define Core Content & Access Prisma Schemas (URLs, Groups, UserGroupAccess, UrlInGroup)**
    * **As the** System/Developer,
    * **I want** robust Prisma schemas defined for `Url` entities (storing URL details like original URL, a **required** title, and paths to server-hosted favicons), `Group` entities (for organizing URLs, with properties like a unique name and description), a `UrlInGroup` relation (to manage URLs within groups, including their display order and group-specific properties), and a `UserGroupAccess` relation (to link specific users to groups they are permitted to access), with appropriate referential actions (`onDelete: SetNull`) for user deletion concerning creator fields.
    * **So that** the application has a clear, relational, and extensible database structure for managing all core content, its organization, user-specific access rights, and maintains integrity if creator/assigner users are deleted.
    * **Acceptance Criteria:**
        * `[ ]` The `prisma/schema.prisma` file is updated to include new model definitions for `Url`, `Group`, `UrlInGroup`, and `UserGroupAccess`.
        * `[ ]` The existing `User` model (from Story 1.2) is updated to include necessary relation fields.
        * `[ ]` A `Url` model is defined with at least: `id` (String, `@id @default(cuid())`), `originalUrl` (String, `@unique`), `title` (String) **(Required)**, `faviconUrl` (String, Optional `?` - Path to server-hosted, uploaded icon for this URL), `notes` (String, Optional `?`), `mobileSpecificUrl` (String, Optional `?`), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`), `groups` (Relation field: `UrlInGroup[]`), `addedByUserId` (String, Optional `?`), `addedBy` (Relation field: `User? @relation("AddedUrls", fields: [addedByUserId], references: [id], onDelete: SetNull)`).
        * `[ ]` A `Group` model is defined with at least: `id` (String, `@id @default(cuid())`), `name` (String - **Not globally unique**), `description` (String, Optional `?`), `displayOrder` (Int, Optional `?`), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`), `urls` (Relation field: `UrlInGroup[]`), `accessibleToUsers` (Relation field: `UserGroupAccess[]`), `createdByUserId` (String, Optional `?`), `createdBy` (Relation field: `User? @relation("CreatedGroups", fields: [createdByUserId], references: [id], onDelete: SetNull)`).
        * `[ ]` A `UrlInGroup` model is defined with: `id` (String, `@id @default(cuid())`), `urlId` (String), `url` (Relation: `Url @relation(fields: [urlId], references: [id], onDelete: Cascade)`), `groupId` (String), `group` (Relation: `Group @relation(fields: [groupId], references: [id], onDelete: Cascade)`), `displayOrderInGroup` (Int, default: 0), `groupSpecificTitle` (String, Optional `?`), `addedToGroupAt` (DateTime, `@default(now())`), `@@unique([urlId, groupId])`. (Field `groupSpecificFaviconUrl` was removed).
        * `[ ]` A `UserGroupAccess` model is defined with: `id` (String, `@id @default(cuid())`), `userId` (String), `user` (Relation: `User @relation(fields: [userId], references: [id], onDelete: Cascade)`), `groupId` (String), `group` (Relation: `Group @relation(fields: [groupId], references: [id], onDelete: Cascade)`), `assignedAt` (DateTime, `@default(now())`), `@@unique([userId, groupId])`.
        * `[ ]` The `User` model in `schema.prisma` is updated to include the inverse relations: `addedUrls: Url[] @relation("AddedUrls")`, `createdGroups: Group[] @relation("CreatedGroups")`, `groupAccesses: UserGroupAccess[]`.
        * `[ ]` A new Prisma migration (e.g., `add_content_access_url_favicon_schemas_final`) is successfully generated from all schema updates.
        * `[ ]` This migration is successfully applied to the SQLite database, creating/altering the necessary tables and relations.
        * `[ ]` The migration files are present in `/prisma/migrations`.
        * `[ ]` Prisma Client is successfully (re)generated (`npx prisma generate`) to include types and methods for interacting with all new and updated models.

* **Story 3.2: Implement Admin API Endpoints for CRUD Operations on URL Groups**
    * **As an** Administrator (interacting via a future Admin UI),
    * **I want** to have secure backend API endpoints, specifically at the path `/api/admin/urlGroups`, that allow me to Create new URL groups, Read (list) all existing groups (sorted by `displayOrder` then `name`), Update the properties of a specific group (like its name, description, or global display order), and Delete a group.
    * **So that** I can centrally manage the library of URL groups that will form the organizational backbone for the URLs presented to users.
    * **Acceptance Criteria:**
        * `[ ]` New API route handlers are created under the path `/api/admin/urlGroups` (e.g., `/app/api/admin/urlGroups/route.ts` for list/create, and `/app/api/admin/urlGroups/[groupId]/route.ts` for get/update/delete).
        * `[ ]` All endpoints under `/api/admin/urlGroups` are protected and strictly require the requester to be authenticated with an `ADMIN` role. Unauthorized (401) or forbidden (403) access attempts are rejected with appropriate HTTP error responses.
        * `[ ]` (`POST /api/admin/urlGroups` - Create Group): Accepts JSON request body with `name` (String, required), `description` (String, optional), `displayOrder` (Integer, optional - defaults to a sensible value like 0 or end-of-list if not provided). Server-side validation: `name` is provided and not empty. (Uniqueness for `name` is NOT enforced at DB level per Story 3.1 update). `createdByUserId` field is populated with the ID of the authenticated admin. Returns the newly created `Group` object (HTTP 201 Created). Handles errors.
        * `[ ]` (`GET /api/admin/urlGroups` - List Groups): Fetches all `Group` records. Returns JSON array of `Group` objects (incl. `id, name, description, displayOrder, createdAt, updatedAt, createdByUserId`). List is sorted primarily by `displayOrder` (ascending, nulls last/first consistently), secondarily by `name` (ascending). Returns empty array (`[]`) (HTTP 200 OK) if no groups exist.
        * `[ ]` (`GET /api/admin/urlGroups/[groupId]` - Get Single Group): Accepts `groupId`. Fetches specific `Group`. Returns `Group` object (HTTP 200 OK) or 404 if not found.
        * `[ ]` (`PUT /api/admin/urlGroups/[groupId]` - Update Group): Accepts `groupId`. Accepts JSON body with optional `name`, `description`, `displayOrder`. Validates `name` is not empty if provided. Updates specified fields. Returns updated `Group` (HTTP 200 OK) or 404. Handles errors.
        * `[ ]` (`DELETE /api/admin/urlGroups/[groupId]` - Delete Group): Accepts `groupId`. Deletes `Group`. Related `UrlInGroup` and `UserGroupAccess` entries cascade delete (verified). Returns HTTP 204 No Content or 200 OK, or 404.
        * `[ ]` (Error Handling) Consistent HTTP status codes and JSON error messages for all endpoints.

* **Story 3.3: Implement Admin API Endpoints for CRUD Operations on Global URLs (with Enhanced Icon Auto-Fetch)**
    * **As an** Administrator,
    * **I want** to have secure backend API endpoints that allow me to Create new global URL entries (where the system attempts to auto-discover and fetch a link to the best available **application icon/favicon**, and a `title` is required), Read all existing global URLs (sorted by `title`), Update their properties, and Delete global URL entries.
    * **So that** I can centrally manage the master library of URLs, with an attempt to automatically populate representative icons for convenience, while still allowing manual override by uploading a custom icon.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint Structure & Security) API routes under `/api/admin/urls`. `ADMIN` role required.
        * `[ ]` (`POST /api/admin/urls` - Create Global URL) Accepts `originalUrl` (req, unique, valid URL), `title` (req, not empty), `faviconUrl?` (manual path), `notes?`, `mobileSpecificUrl?` (valid URL if provided).
            * **Enhanced Icon Auto-Discovery Logic:** If `faviconUrl` not provided in request: backend attempts best-effort (short timeout) discovery of best available icon link for `originalUrl` (checks favicons, apple-touch-icons, manifest icons, Open Graph images, prioritizing higher-res). Discovered URL stored in `Url.faviconUrl` (stores link, not re-hosted file). Manual `faviconUrl` path overrides.
        * `[ ]` New `Url` record created with details, determined `faviconUrl`, and `addedByUserId`. Returns new `Url` object (HTTP 201). Handles errors.
        * `[ ]` (`GET /api/admin/urls` - List URLs) Fetches all `Url` records. Returns JSON array of `Url` objects. Sorted by `title` alphabetically (ascending).
        * `[ ]` (`GET /api/admin/urls/[urlId]` - Get Single URL) Returns `Url` object (200 OK) or 404.
        * `[ ]` (`PUT /api/admin/urls/[urlId]` - Update URL) Accepts optional fields. If `originalUrl` changed & no new `faviconUrl` given, re-attempts icon auto-discovery. Explicit `faviconUrl` path takes precedence. Validates. Returns updated `Url` (200 OK) or 404.
        * `[ ]` (`DELETE /api/admin/urls/[urlId]` - Delete URL) Deletes `Url`. `UrlInGroup` entries cascade delete. Returns 204/200 or 404.
        * `[ ]` (Error Handling) Consistent.

* **Story 3.4: Implement Admin API Endpoints for Managing URLs within Specific Groups**
    * **As an** Administrator,
    * **I want** secure backend API endpoints to add an existing global URL to a group, list URLs within a group (ordered), update URL properties specific to that group membership (display order, group-specific title), and remove a URL from a group.
    * **So that** I can precisely curate group content.
    * **Acceptance Criteria:**
        * `[ ]` (API Structure & Security) Routes: `POST /api/admin/urlGroups/[groupId]/urls`, `GET /api/admin/urlGroups/[groupId]/urls`, `PUT /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`, `DELETE /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. `ADMIN` role.
        * `[ ]` (`POST .../[groupId]/urls` - Add URL to Group) Accepts `groupId` (path), body: `urlId` (req), `displayOrderInGroup?` (default 0/end), `groupSpecificTitle?`. Validates existing Group/Url, unique combo (`@@unique` in `UrlInGroup`). Creates `UrlInGroup`. Returns 201 with `UrlInGroup` or augmented URL.
        * `[ ]` (`GET .../[groupId]/urls` - List URLs in Group) Accepts `groupId`. Fetches `UrlInGroup` records for `groupId`, including related `Url` data. Response: JSON array (global `Url` data + `UrlInGroup` overrides like `effectiveTitle`, `urlInGroupId`, `displayOrderInGroup`), sorted by `UrlInGroup.displayOrderInG`roup (ASC). 404 if group not found. Empty array if group has no URLs.
        * `[ ]` (`PUT .../[groupId]/urls/[urlInGroupId]` - Update URL-in-Group) Accepts `groupId`, `urlInGroupId`. Body: `displayOrderInGroup?`, `groupSpecificTitle?`. Updates `UrlInGroup`. Returns updated object or 404.
        * `[ ]` (`DELETE .../[groupId]/urls/[urlInGroupId]` - Remove URL from Group) Accepts `groupId`, `urlInGroupId`. Deletes `UrlInGroup` association. Returns 204/200 or 404.
        * `[ ]` (Error Handling) Consistent.

* **Story 3.5: Develop Admin UI for URL Group Management**
    * **As an** Administrator,
    * **I want** an admin UI to CRUD URL Groups (list sorted by `displayOrder` then `name`), with confirmations.
    * **So that** I can visually manage URL groups.
    * **Acceptance Criteria:**
        * `[ ]` (UI Page & Access) `/admin/url-groups` page, admin layout, `ADMIN` only.
        * `[ ]` (List Groups) Fetches from `GET /api/admin/urlGroups`. Loading/error states. MUI `Table`/`List` shows `name`, `description?`, `displayOrder`. Sorted by API default. Message if no groups. Actions column with Edit/Delete buttons.
        * `[ ]` (Create Group) Prominent green/success MUI `Button` "Create New Group" opens `Dialog` with form (`name` (req), `description?`, `displayOrder?`). Client validation. Confirmation dialog ("Are you sure... create group '[name]'?"). On confirm, `POST` API. List refreshes. Success/error `Snackbar`.
        * `[ ]` (Edit Group) "Edit" action -> `Dialog` pre-filled. Admin modifies. Client validation. Confirmation dialog ("Are you sure... save changes to group '[original/new name]'?"). On confirm, `PUT` API. List refreshes. Success/error.
        * `[ ]` (Delete Group) "Delete" action -> `Dialog` with stern warning about cascade. `DELETE` API. List refreshes. Success/error.
        * `[ ]` (UX) MUI components, loading indicators, feedback. Responsive (desktop/tablet focus).

* **Story 3.6: Develop Admin UI for Managing URLs *within* a Selected Group**
    * **As an** Administrator,
    * **I want** a UI where, after selecting a Group, I can add existing global URLs, remove them, reorder (`displayOrderInGroup`), and edit their `groupSpecificTitle`.
    * **So that** I can curate content within each group.
    * **Acceptance Criteria:**
        * `[ ]` (UI Context) Accessed after selecting a group from Story 3.5 UI (e.g., clicking "Manage Content" for a group, route like `/admin/url-groups/[groupId]/urls`). Uses admin layout. `ADMIN` only.
        * `[ ]` (Display URLs in Group) Clearly indicates group being managed. API call `GET /api/admin/urlGroups/[groupId]/urls`. Loading/error. URLs in MUI `Table`/List, sorted by `UrlInGroup.displayOrderInGroup`. Shows global `Url.faviconUrl` (or fallback, title if broken), `effectiveTitle` (group-specific or global), `Url.originalUrl`, `displayOrderInGroup`. Message if group empty. Actions column.
        * `[ ]` (Add Existing Global URL to Group) "Add URL to Group" green/success `Button`. Opens `Dialog` with searchable list of global URLs (from `GET /api/admin/urls`). URLs already in current group de-emphasized/filtered. Admin selects URL, optionally sets initial `displayOrderInGroup`, `groupSpecificTitle`. Confirmation dialog. `POST /api/admin/urlGroups/[groupId]/urls`. List refreshes. Success/error `Snackbar`.
        * `[ ]` (Edit URL Properties *within* Group - `UrlInGroup`) "Edit Settings in Group" `IconButton` per URL. Opens `Dialog` pre-filled: `displayOrderInGroup`, `groupSpecificTitle`. Read-only global `Url.title`/`originalUrl` for reference. Confirmation. `PUT /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. List refreshes.
        * `[ ]` (Reorder URLs in Group) Drag-and-drop or Up/Down `IconButtons` to change `displayOrderInGroup`. Triggers API updates. UI reflects new order.
        * `[ ]` (Remove URL from Group) "Remove from Group" `IconButton`. Confirmation ("...does not delete global URL."). `DELETE /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. List refreshes.
        * `[ ]` (Navigation & UX) Easy navigation back to Story 3.5 UI. MUI, loading, feedback. Responsive.

* **Story 3.6.5: Develop Admin UI for Global URL Management**
    * **As an** Administrator,
    * **I want** a dedicated admin page (`/admin/global-urls`) to list all global URLs, create new ones (with UI for icon auto-fetch feedback & manual `Url.faviconUrl` upload via drag-and-drop + button), edit global properties, and delete them, with confirmations.
    * **So that** I have a central place to manage the master URL library.
    * **Acceptance Criteria:**
        * `[ ]` (UI Page & Access) `/admin/global-urls` page, admin layout, `ADMIN` only.
        * `[ ]` (List Global URLs) Fetches from `GET /api/admin/urls`. Loading/error. MUI `Table` shows `Url.faviconUrl` (or fallback, title if broken), `title`, `originalUrl`. Sorted by `title` ASC. Client/server pagination for many URLs. Message if no global URLs. Actions column.
        * `[ ]` (Create Global URL UI) Prominent green/success "Create New Global URL" `Button`. Opens `Dialog` with form: `originalUrl` (req), `title` (req), `notes?`, `mobileSpecificUrl?`.
            * Global Favicon Management Section: On `originalUrl` input, client triggers icon auto-discovery (Story 3.3). Preview auto-discovered icon. `Snackbar` if auto-fetch fails. "Upload Custom Icon" (drag-and-drop + button; JPG/PNG/ICO, max 100KB, client validation, preview). Admin chooses auto-discovered or uploaded for `Url.faviconUrl`.
        * `[ ]` Client validation. Confirmation. `POST /api/admin/urls`. Handles 409 duplicate `originalUrl` error from API in UI ("Error: URL exists as '[Existing Title]'..."). List refreshes. Success/error `Snackbar`.
        * `[ ]` (Edit Global URL UI) "Edit" `IconButton` per URL. `Dialog` pre-filled with global props. Admin modifies. Global Favicon Management UI (as in Create, including Re-check Auto-Discover, Remove Custom Icon) available. Confirmation. `PUT /api/admin/urls/[urlId]`. List refreshes.
        * `[ ]` (Delete Global URL UI) "Delete" `IconButton`. Confirmation ("...delete global URL '[title]'? Removed from all groups..."). `DELETE /api/admin/urls/[urlId]`. List refreshes.
        * `[ ]` (UX) MUI, loading, feedback. Responsive. Icon upload limits enforced.

* **Story 3.7: Implement API Endpoint for Authenticated Users to Fetch Their Accessible Groups and URLs**
    * **As an** Authenticated User, **I want** an API (`/api/dashboard/urlGroups`) for my accessible Groups & URLs (dates as ISO strings in JSON). **So that** the frontend can display personalized content.
    * **Acceptance Criteria:**
        * `[ ]` (API & Security) `GET /api/dashboard/urlGroups`. Authenticated (any role).
        * `[ ]` (Data Fetching) Identifies user. Queries `UserGroupAccess` for `groupId`s. For each, gets `Group` details. For each `Group`, gets `UrlInGroup` records (ordered by `displayOrderInGroup` ASC), including related `Url` data.
        * `[ ]` (API Response Structure) 200 OK JSON array of `Group` objects (sorted `Group.displayOrder` ASC then `Group.name` ASC). Each `Group`: `id, name, description?, displayOrder?`, `urls` array. Dates (e.g., `Group.createdAt`) are ISO strings. Each URL in `urls`: `urlId, urlInGroupId, effectiveTitle (UrlInGroup.groupSpecificTitle` or `Url.title`), `originalUrl, faviconUrl (global Url.faviconUrl), mobileSpecificUrl?, notes?, displayOrderInGroup`. Dates from `Url` are ISO strings.
        * `[ ]` (Empty States) Empty array `[]` if no accessible groups. Group's `urls` array empty if group has no URLs.
        * `[ ]` (Error Handling) Consistent (500 for server errors).
        * `[ ]` (Performance) Optimized DB query.

* **Story 3.8: Implement Global User Menu and Application Header**
    * **As an** Authenticated User, **I want** a consistent, responsive `AppBar` (conditional on desktop based on "Top Menu" pref, always on mobile with hamburger for drawer) with App Name/Logo, and a User Menu button (avatar/name) opening a dropdown (Dashboard, Settings, conditional Admin link, persisted Theme Toggle, Logout). **So that** I can easily navigate and manage my session/preferences.
    * **Acceptance Criteria:**
        * `[ ]` (AppBar Structure & Common Elements) MUI `AppBar`, persistent on auth pages. Left: App Logo/Name (Story 2.4 branding). Right: User Button (MUI `Button`/`IconButton` - avatar/name desktop, avatar only mobile; opens User Dropdown). Mobile Only (Far Left): Hamburger icon (MUI `IconButton`) toggles MUI `Drawer` state (drawer content by Story 3.9).
        * `[ ]` (Desktop "Top Menu Layout" Header Structure) If `menuPosition === TOP` (desktop): AppBar has 3 sections: `[Logo/Name (Left)] [Central Area for Top Navigation Content (Story 4.3)] [User Button (Right)]`. Mobile: central area hidden.
        * `[ ]` (User Dropdown Menu) Clicking User Button opens/closes MUI `Menu`. Items: "Dashboard" (`/dashboard`), "Settings" (`/settings/profile`), "Admin Area" (conditional on `ADMIN` role, to `/admin`) - all MUI `MenuItem`s + icons. Theme Control: "Toggle Theme" / "Light/Dark/System Mode" `MenuItem` + icons; toggles persisted theme (Story 4.1) via API, updates UI dynamically. Session Management: "Logout" `MenuItem` + icon; triggers `signOut({ callbackUrl: '/login' })`.
        * `[ ]` (Responsiveness & Interaction) AppBar & elements responsive. User Button adapts. Mobile Menu Toggle appears/disappears. Dropdown keyboard navigable, `Escape` closes. Focus managed.
        * `[ ]` (State & Context) Uses `useSession()` (user details, role, logout). Theme toggle uses Theme Context & persisted setting. Nav uses Next.js router.

* **Story 3.9: Implement User Dashboard UI with Multi-Iframe Handling, State Preservation, and Device-Specific Navigation**
    * **As an** Authenticated User, **I want** my dashboard to display assigned URLs/Groups with visual states (opacity 0.5 non-active/non-loaded, 1.0 non-active/loaded, 1.0 + active indicator: underline for Top Menu, right border for Side Menu/Mobile Drawer) via desktop top-menu or mobile drawer (accordion groups, active URL has blue right border). Selecting a URL makes its iframe visible (preserving state via `visibility:hidden` for others). First URL auto-loads. Selected group remembered during current session. Neutral UI (or console.log) for no groups. Handles broken favicons by showing title. No main page scroll.
    * **So that** I can access content with clear cues and state preservation for MVP.
    * **Acceptance Criteria:**
        * `[ ]` (Dashboard Page & Data) `/dashboard/page.tsx` in global layout (Story 3.8). Fetches from `GET /api/dashboard/urlGroups` (Story 3.7). Loading/error states. If no groups: neutral UI (e.g., "Dashboard is empty."), `console.log`.
        * `[ ]` (Desktop Group/URL Display - "Top Menu" Style - when `menuPosition === 'TOP'`) `AppBar` (Story 3.8) hosts content from Story 4.3 (hover-to-expand menu with group selection & horizontal URLs).
        * `[ ]` (Mobile Group/URL Display - Collapsible Left Drawer) On mobile: hamburger in `AppBar` (Story 3.8) toggles MUI `Drawer`. Inside Drawer: list of groups (sorted); each group MUI `Accordion` header. Clicking group expands in-place to show its URLs as sub-list. Selecting URL closes drawer.
        * `[ ]` (URL Item Visual States - for Desktop & Mobile lists) Active/selected URL: opacity `1.0` + blue underline (Top Menu) / blue right border (Side Menu & Mobile Drawer). Inactive but loaded URL: opacity `1.0`. Inactive and unloaded URL: opacity `0.5`.
        * `[ ]` (Multi-Iframe Management & Display - Basic Version for Epic 3, enhanced by Story 4.2) One iframe per unique `originalUrl` selected, added to DOM if new. Active URL's iframe: `visibility: visible`. Others: `visibility: hidden; position:absolute; left:-9999px;`. State preserved. `src`/`data-src` pattern used for loading.
        * `[ ]` (Initial Iframe Load & Basic State Indicators) First URL of default group auto-loads. Iframe `src` set first time: loading indicator (MUI `CircularProgress`/text). On success, indicator removed, URL item "loaded" state. On failure, error message in iframe area, URL item "unloaded".
        * `[ ]` (Selected Group State Persistence - Current Session) Selected group maintained during current active session (e.g., React Context/state). Resets on full reload/new login for Epic 3.
        * `[ ]` (Broken Favicon Handling) If `Url.faviconUrl` image fails to load, broken icon hidden, `effectiveTitle` is primary identifier.
        * `[ ]` (UX & Layout) Intuitive flow. Clear layout separation. No main page scrollbars, 100% viewport height.

### Epic 4: Advanced Iframe Interaction & User Personalization
**Goal:** Implement a highly interactive and customizable user dashboard experience, including user-selectable menu positions (Side or Top for desktop URL/Group navigation), advanced iframe state management (persisting multiple loaded iframes with CSS `visibility` for state retention, and an explicit unload mechanism via long-press), clear visual indicators in the menus for URL states (active/inactive, loaded/unloaded using opacity/underline/border), and specific performance optimizations. (Search feature was removed).

* **Story 4.1: Implement Persistent User Settings for Layout (Menu Position & Theme)**
    * **As an** Authenticated User,
    * **I want** to be able to choose my preferred main navigation menu position for desktop viewing (Top Menu or Side Menu) and my preferred application theme (Light, Dark, or System default) via my User Settings page. These preferences should be saved to my account and applied consistently across the application, with the header and dashboard layouts dynamically adapting to my chosen menu position and theme.
    * **So that** I can personalize my ControlCenter interface for optimal usability, comfort, and visual preference, and have these settings persist across my sessions and devices.
    * **Acceptance Criteria:**
        * `[ ]` (Schema Definition - `UserSetting` Model) A new Prisma model `UserSetting` is defined with a strict one-to-one relationship to `User` (`userId String @id`, `user User @relation(...)`).
        * `[ ]` `UserSetting` includes: `theme Theme @default(SYSTEM)` (Enum: `LIGHT DARK SYSTEM`), `menuPosition MenuPosition @default(TOP)` (Enum: `TOP SIDE`), `updatedAt DateTime @updatedAt`.
        * `[ ]` `User` model updated with `settings UserSetting?` relation.
        * `[ ]` Prisma migration generated and applied. Prisma Client regenerated.
        * `[ ]` Logic is added to the user creation process (e.g., Story 1.2 for initial admin, Story 2.3 for admin-created users) to automatically create a corresponding `UserSetting` record with default values (`theme: SYSTEM`, `menuPosition: TOP`) whenever a new `User` is created.
        * `[ ]` (Backend API for User Settings) New secure API endpoints `GET /api/user/settings` and `PUT /api/user/settings` are created.
        * `[ ]` `GET /api/user/settings` fetches the `UserSetting` record for the authenticated user (should always find a record due to AC 1.5).
        * `[ ]` `PUT /api/user/settings` accepts `theme` (LIGHT/DARK/SYSTEM) and/or `menuPosition` (TOP/SIDE), updates the existing `UserSetting` record. Validates enum values. Returns updated settings. Both endpoints protected, user-specific.
        * `[ ]` (Session Data Enhancement) NextAuth.js session object (and JWT) includes persisted `theme` and `menuPosition` from `UserSetting`.
        * `[ ]` (User Settings Page UI - on `/settings/profile`) A "Layout & Appearance Preferences" section is added.
        * `[ ]` UI controls (MUI `RadioGroup` or `SegmentedButton`) for "Preferred Menu Position (Desktop)" (Options: Top, Side) with small static image previews, reflecting current saved preference.
        * `[ ]` UI controls (MUI `RadioGroup` or `SegmentedButton`) for "Preferred Theme" (Options: Light, Dark, System) with themed preview boxes (showing bg color, themed text "AppName" & logo placeholder, theme name text; selected theme preview has blue highlight), reflecting current saved preference.
        * `[ ]` "Save Preferences" button calls `PUT /api/user/settings`. Success/error `Snackbar`. UI dynamically updates on save without full page reload.
        * `[ ]` (Dynamic Header Adaptation - affects Story 3.8) Global Application Header reads `menuPosition` from session/settings. Desktop: Adapts structure (three-section for "Top Menu" pref vs. hidden for "Side Menu" pref). Mobile header consistent.
        * `[ ]` (Dynamic Dashboard Layout - affects Story 3.9) Dashboard reads `menuPosition`. Desktop: "Top Menu" pref -> URL/Group nav in AppBar's central area (content by Story 4.3). "Side Menu" pref -> persistent side panel for URL/Group nav (content by Story 4.4); top AppBar URL nav area hidden, AppBar itself hidden. Mobile: always drawer.
        * `[ ]` (Theme Application & Header Toggle Update - affects Story 3.8) MUI ThemeProvider uses persisted `UserSetting.theme`. Header theme toggle reads/writes persisted setting via API. "SYSTEM" theme respects OS `prefers-color-scheme` (reload pick-up sufficient for MVP, fallback to DARK if OS pref undetectable).
        * `[ ]` (Default Values & Persistence) Settings saved to backend. Defaults (`theme: SYSTEM`, `menuPosition: TOP`) applied on `UserSetting` creation.

* **Story 4.2: Implement Core Iframe State Management (Tracking Multiple Mounted Iframes, Loaded/Unloaded States, Active URL with `src`/`data-src` control)**
    * **As the** Frontend System / Dashboard UI,
    * **I want** a robust client-side state management system (e.g., using React Context via an `IframeProvider` and a custom hook like `useIframeManager`) that tracks multiple iframes (kept mounted with visibility controlled by CSS `visibility: hidden`), manages their "loaded" (content in `src`) vs. "unloaded" (`src=""`) states using a `src`/`data-src` attribute pattern, and identifies the "active" URL for display. It must also apply default restrictive `sandbox` attributes to iframes.
    * **So that** the application can support efficient, stateful switching between iframes, with precise control over content loading and resource usage, providing accurate data for visual state indicators (opacity for loaded/unloaded states) in the navigation menus, while maintaining security.
    * **Acceptance Criteria:**
        * `[ ]` (`IframeProvider` Context) React Context (`IframeStateContext`) & Provider (`<IframeProvider>`) wraps dashboard. Stores: `managedIframes: Map<string, { originalSrc: string; currentSrc: string; isLoaded: boolean; }>` (key: URL identifier), `activeUrlIdentifier: string | null`.
        * `[ ]` (`useIframeManager` Hook) Exposes: `activeUrlIdentifier`, `getIframeData(id)`, `isUrlLoaded(id)`, `setActiveUrl(id, originalSrc)` (signals iframe `src` set from `data-src` if unloaded/new), `markAsLoaded(id)` (on iframe `onload`), `markAsUnloaded(id)` (signals iframe `src` to `""`), `triggerReload(id)`, `getAllManagedIframesForRender()` (returns array `{ identifier, dataSrc, srcToRender, isLoaded, isActive }`). Hook interface is optimized for efficient updates using memoized React Context and `React.memo` on consumers.
        * `[ ]` (Dashboard Iframe Rendering) Uses `useIframeManager`. Iterates `getAllManagedIframesForRender()` to render `<iframe>`s. Each has `key`, `src` (bound to `srcToRender`, initially `""`), `data-src` (actual `originalUrl`). `setActiveUrl` needing load triggers dashboard to update target iframe `src` from `data-src`.
        * `[ ]` (CSS Visibility Control) Active iframe: `visibility: visible`. Others: `visibility: hidden; position: absolute; left: -9999px;`.
        * `[ ]` (Iframe Sandbox Attributes) All iframes rendered by this system include a default `sandbox` attribute string: `"allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"`. (Top navigation is implicitly blocked).
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
            * Panel Content (Expanded): Top: App Logo/Name (Story 2.4). Collapse/Expand toggle button (MUI `IconButton` chevron) in panel's top section (e.g. top right of panel). Middle (Navigation): Vertical list of URL Groups (accordion style), sorted. Expanding group shows its URLs. URL items: `faviconUrl` (or fallback, title if broken) AND `effectiveTitle`. Visual states: opacity 0.5 (unloaded), 1.0 (loaded), blue **right side border** (active). Selected group expanded by default. Bottom: Reusable User Menu component (Story 3.8) rendered as accordion section ("User Options") or list.
        * `[ ]` (Side Panel Collapsible Behavior - Desktop/Tablet ≥768px) Clicking toggle animates panel width.
            * Collapsed State (Icons-Only): Panel shrinks (~72px). Group headers show abbreviated initials in circle/avatar or generic group icon. URLs in (conceptually) expanded group show only `Url.faviconUrl`. User Menu collapses to icon trigger (opens small popper/menu). MUI `Tooltip` on hover for all icons.
        * `[ ]` Main content area resizes smoothly. User's collapsed/expanded state preference persists for session (e.g., `localStorage`).
        * `[ ]` (URL/Group Interaction) Click group header expands/collapses. Click URL sets active URL. Indicators update.
        * `[ ]` (Integration) Renders on `menuPosition === SIDE`. No `AppBar` (desktop/tablet). Consumes `useIframeManager`, group/URL data. Updates active URL/selected group.
        * `[ ]` (Performance & Transitions) Smooth animations (300ms) for panel/accordion. Efficient rendering.

* **Story 4.5: Implement Click (Activate/Ensure Loaded/Reload) and Long-Press (Unload) for URLs with Specific Unload UI**
    * **As an** Authenticated User,
    * **I want** specific and intuitive behaviors when I single-click or long-press (for 2 seconds with a visual progress indicator) on a URL item in any navigation menu: a single click should activate the URL (loading it if currently unloaded, making it visible if loaded but hidden, or reloading it if already active and visible). A successful long press should unload that URL's iframe content, make its iframe hidden, and display a "Content Unloaded" message with a reload option in the iframe area.
    * **So that** I have powerful and clear control over URL loading, viewing, resource management, and can easily recover unloaded content within the dashboard.
    * **Acceptance Criteria:**
        * `[ ]` (Single-Click Behavior - All Menus) If URL not active OR unloaded: `setActiveUrl()` (loads via `src` from `data-src`). Menu item "active" (opacity 1.0 + indicator). "Content Unloaded" message (if visible) cleared. If URL active AND loaded: Reloads active iframe content (e.g., `src` from `data-src` again). Loading indicators. Menu item "active."
        * `[ ]` (Long-Press Detection & Visual Feedback - `useLongPress`) Hook/logic detects 2s sustained press (mouse/touch) with 0.3s delay before animation. Visual progress bar (orange, 2-3px thick, animating left-to-right along bottom edge of URL item) during hold. Optional tooltip. Event listeners managed.
        * `[ ]` (Long-Press Action - Unload) On 2s press: `markUrlAsUnloaded()` (Story 4.2 - sets iframe `src=""`, state "loaded: false"). Menu item "unloaded" (opacity 0.5, loses active indicator). Haptic feedback on mobile.
        * `[ ]` (Behavior if Active URL Unloaded) Unloaded URL's iframe `visibility: hidden`. Main content area displays: centered "Content Unloaded" text (contrasting color) + "Reload Content" MUI `Button` (`variant="outlined"` with refresh icon). Clicking "Reload" calls `setActiveUrl()` for that URL, re-initiating load; message/button removed; iframe loaders appear; menu item "active". `activeUrlIdentifier` may persist (but item not styled active until reloaded) or become null (reload button knows context). Selecting another URL loads it, clears "Content Unloaded" message.
        * `[ ]` (Cancellation of Long Press) Release before 2s or move pointer away: long-press cancelled, progress indicator resets. No single-click triggered.
        * `[ ]` (Integration) Actions update `useIframeManager` states. Menu indicators update instantly.

* **Story 4.6: Ensure Advanced Features & Opacity/Underline/Border Indicators Work in Mobile Drawer Navigation**
    * **As an** Authenticated User (on mobile),
    * **I want** the mobile navigation drawer (from Story 3.9, toggled by Story 3.8's header) to accurately display the refined URL state indicators (opacity for loaded/unloaded, and an active indicator: blue right side border). I also want advanced interactions like long-press to unload URLs (with haptic feedback and progress indicator) to be fully functional and optimized for touch within this mobile drawer environment.
    * **So that** I have a consistent, rich, and usable experience managing and interacting with my URLs on mobile devices, equivalent in core advanced functionality to the desktop experiences.
    * **Acceptance Criteria:**
        * `[ ]` (Mobile Drawer URL Item Visual States) URL items in mobile drawer (Story 3.9 accordion) display universal visual states from `useIframeManager` (Story 4.2): opacity 0.5 (unloaded), 1.0 (loaded). Active URL has blue **right side border**.
        * `[ ]` (Click Interaction in Mobile Drawer) Single-click triggers "Activate/Ensure Loaded/Reload" (Story 4.5). Iframe updates, drawer closes, indicators update.
        * `[ ]` (Long-Press Interaction in Mobile Drawer) Long-press (2s) triggers "Unload URL Content" (Story 4.5). Visual progress bar on item. Haptic feedback. Item "unloaded" (opacity 0.5). Iframe area shows "Content Unloaded" UI.
        * `[ ]` (Mobile Usability & Touch Optimization) Touch targets adequate. Animations smooth.
        * `[ ]` (Consistency) State changes via `useIframeManager` consistent with desktop. "Loaded"/"unloaded" status universal.

---
### Epic 5: Admin Dashboard - System Operations & Monitoring
**Goal:** Equip administrators with critical system operation tools, including asynchronous database backup (with manifest) and restore functionality (with manifest reading & migration handling, UI for file management, and pre-restore backup suggestion), basic system statistics, user activity tracking (with structured JSON details), and configurable log retention (default 180 days, with automated pruning, manual trigger, and pruning logged to activity log).

* **Story 5.1: Implement Backend Logic and API for Application Backup (Async, with Backup Manifest)**
    * **As an** Administrator, **I want** a secure API endpoint that initiates a full application backup (DB, assets, manifest with DB schema version) as an asynchronous background process, returning an immediate "initiated" acknowledgment. **So that** I can trigger backups without UI timeout and perform potentially long backups efficiently.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint) `POST /api/admin/system/backup`. `ADMIN` role.
        * `[ ]` (Data to Backup) SQLite DB file, `/public/avatars/`, `/public/url_favicons/`, `/public/branding/`. `.env` excluded.
        * `[ ]` (Backup Archive Creation - Background) Collects data, creates metadata (AC 4), packages into timestamped `.zip` (e.g., `controlcenter_backup_YYYYMMDD_HHMMSS.zip`) with relative paths.
        * `[ ]` (Backup Manifest File) `backup_manifest.json` in zip root: `backupCreatedAtTimestamp` (ISO), `databaseSchemaVersionId` (last Prisma migration ID), `applicationVersion?` (from `package.json`/git hash).
        * `[ ]` (Backup Storage - Background) Saves archive to designated secure server dir (e.g., `/data/backups/`, configurable). New archive per operation (no auto-rotation for MVP).
        * `[ ]` (API Response - Async) On successful *initiation*: HTTP 202 Accepted. JSON response: "Backup process initiated successfully...". Optional task ID. If initiation fails: 4xx/500 error. Errors *during background process* logged server-side.
        * `[ ]` (DB Integrity) Attempts to ensure SQLite integrity during backup (online backup API or direct copy with documented considerations).
        * `[ ]` (Resource & Async Execution) Backup is asynchronous. API returns quickly.

* **Story 5.1.5: Implement API Endpoints for Managing Backup Files (List, Download, Delete)**
    * **As an** Administrator, **I want** secure backend APIs to list available backup archives from server, download a specific file, and delete a file. **So that** I can manage backup lifecycles via the admin UI.
    * **Acceptance Criteria:**
        * `[ ]` (API Security) Endpoints under `/api/admin/system/backups/` require `ADMIN` role.
        * `[ ]` (List Backups: `GET /api/admin/system/backups`) Reads backup dir. Returns JSON array: `{ filename, createdAtTimestamp (from name/meta), sizeBytes, databaseSchemaVersionId?, applicationVersion? (optional, if manifest parsed for list) }`. Sorted newest first. Empty array if none. Handles errors.
        * `[ ]` (Download Backup: `GET /api/admin/system/backups/[filename]`) Validates filename. Streams `.zip` file with download headers. 404 if not found/invalid. Handles read errors.
        * `[ ]` (Delete Backup: `DELETE /api/admin/system/backups/[filename]`) Validates filename. Deletes file from server. 204/200 or 404. Handles errors.
        * `[ ]` (Security) Filename params sanitized (no path traversal). Backup dir not public.

* **Story 5.2: Implement Backend Logic and API for Application Restore from Backup (Async, Refined Restore Order, Manifest Reading & Migration Handling)**
    * **As an** Administrator, **I want** a secure API to upload a backup archive and initiate an async background restore (DB first & migrations, then assets), with immediate API acknowledgment. **So that** I can reliably recover or perform initial setup via "First Run Restore", with a safer process and no UI timeout.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint) `POST /api/admin/system/restore`. Accepts `.zip` file upload. `ADMIN` role (with considerations for First Run context).
        * `[ ]` (Archive Validation - Background) Validates `.zip`. Unzips securely. Verifies `controlcenter.db`, `backup_manifest.json`, asset folders. Aborts with server log if critical files missing.
        * `[ ]` (Manifest Reading - Background) `backup_manifest.json` read. Details logged.
        * `[ ]` (DB Restore & Migration First - Background) Temp backup of current live SQLite DB made. Live DB replaced with backup's DB. Prisma migrations (`npx prisma migrate deploy` equivalent) programmatically triggered. Error Handling: If DB replace or migration fails, aborts, attempts restore of temp pre-restore DB. Logs error. Asset restore not attempted.
        * `[ ]` (Asset File Restore - Background, Conditional) Only if DB ops successful: (Optional) temp backup of live assets. Live asset dirs cleared/replaced with archive content. File permissions ensured. Error Handling: If asset restore fails, error logged. System may be mixed state.
        * `[ ]` (API Response - Async) On successful *initiation*: HTTP 202 Accepted. JSON: "Restore process initiated from '[filename]'...". If initiation fails: 4xx/500 error. Detailed success/failure of *background process* logged server-side.
        * `[ ]` (Post-Restore System State) After successful background restore: App restart recommended/attempted. Sessions invalidated. If "first run", no longer in that state.

* **Story 5.3: Develop Admin UI for Backup, Restore, and Backup File Management**
    * **As an** Administrator, **I want** an admin UI to: initiate async backups (toast + refresh list); view, download, delete existing server backups; and initiate async restore from uploaded archive (with pre-backup suggestion, stern warnings, "initiated" toast, and UI lock-down overlay with refresh button). **So that** I can easily manage data safety, backup lifecycle, and recovery.
    * **Acceptance Criteria:**
        * `[ ]` (Admin Page) "/admin/system/operations" page. `ADMIN` only. Sections: "Manage Existing Backups," "Create New Backup," "Restore Application."
        * `[ ]` (Manage Existing Backups UI) On load, `GET /api/admin/system/backups`. Loading/error. Backups in MUI `Table`/`List` (filename, createdAt, size). Sorted newest first. "No backups found" message. Actions per backup: "Download" `Button` (`GET .../[filename]`); "Delete" `Button` (Confirmation dialog -> `DELETE` API, refresh list, success/error `Snackbar`). "Refresh List" `Button`.
        * `[ ]` (Create New Backup UI - Async) "Create New Backup" `Button`. Confirmation: "Are you sure...run in background?". On confirm, `POST /api/admin/system/backup`. Loading indicator during API initiation. On 202 Accepted: `Snackbar` "Backup initiated...Refresh list soon." On API init failure: error `Snackbar`.
        * `[ ]` (Restore from Backup UI - Async) Section displays strong warnings. Prominent suggestion/button: "Recommended: Create a fresh backup now?" -> triggers Create Backup flow. File input (`<input type="file" accept=".zip">`) + MUI `Button`. "Upload and Restore" `Button` (disabled until file selected). Clicking -> Stern confirmation ("WARNING...PERMANENTLY OVERWRITE...Are you sure?"). On confirm: Uploads to `POST /api/admin/system/restore`. Loading/progress messages. On 202 Accepted from API: `Snackbar`/message "Restore process initiated...Application might restart...log in again." UI might lock down with overlay and refresh button that enables after a delay. On API init failure: detailed error `Snackbar`.
        * `[ ]` (UX) MUI components, clear feedback, loading states. Responsive (desktop/tablet admin).

* **Story 5.4: Implement Basic System Statistics Display in Admin Dashboard**
    * **As an** Administrator, **I want** an admin UI section showing simple stats (Total Users, Groups, Global URLs) via API. **So that** I can quickly see app usage/scale.
    * **Acceptance Criteria:**
        * `[ ]` (Admin UI) "System Statistics" / "Dashboard Overview" section/page in admin (e.g., on `/admin` or `/admin/stats`). `ADMIN` only.
        * `[ ]` (Stats Displayed) Labels + numerical values for: "Total Registered Users", "Total URL Groups", "Total Global URLs". Clean format (MUI `Card`s or list).
        * `[ ]` (Backend API for Stats) `GET /api/admin/statistics/summary` (or similar) returns JSON `{ userCount, groupCount, urlCount }`. `ADMIN` role. Backend uses Prisma `count()`.
        * `[ ]` (Data Fetching & Display) UI calls API on load. Loading indicator (MUI `Skeleton`). Error message on fail. Stats are read-only. Optional "Refresh Stats" `Button`.
        * `[ ]` (UX) Clear, concise. Responsive (desktop/tablet admin).

* **Story 5.5: Implement Basic User Activity Tracking Log (Backend & Admin UI with structured JSON details)**
    * **As an** Administrator/System, **I want** key actions logged with structured JSON details, and an Admin UI to view this paginated log (with potential basic client-side MUI table search). **So that** there's a rich audit trail.
    * **Acceptance Criteria:**
        * `[ ]` (`ActivityLog` Prisma Model) Fields: `id`, `timestamp`, `userId?`, `actingUserName` (String), `userRole?`, `actionType` (String/Enum), `details (Json?)`, `targetEntityType?`, `targetEntityId?`, `isSuccess?`. `User` relation `onDelete: SetNull`. Migration. Client regen.
        * `[ ]` (Backend Logging Service) Reusable service `createActivityLogEntry(data: CreateActivityLogDto)` (with `details: Record<string, any>`). Creates `ActivityLog` via Prisma.
        * `[ ]` (Key Actions Logged - MVP Scope, with structured `details`): User Login; Admin User Management (Create, Update, Disable/Enable); Admin Branding Changes; Admin Group/URL Mgt (CRUD Groups, URLs, UrlInGroup); System Ops (Backup/Restore initiation & completion); User Settings Changes (Theme/Menu). NO sensitive data.
        * `[ ]` (Admin UI for Activity Log) "/admin/activity-log" page. `ADMIN` only. MUI `Table`. Columns: Timestamp, Acting User, Action Type, Details (parsed JSON, readable format), Target, Success. Reverse chronological. Server-side pagination (25-50/page). Optional: Enable MUI table client-side search if easy for displayed data.
        * `[ ]` (Backend API for Logs) `GET /api/admin/activity-log`. `ADMIN` role. Supports pagination. Returns paginated `ActivityLog` records (`details` as JSON).
        * `[ ]` (Performance & Security) Logging efficient. No sensitive data.

* **Story 5.6: Implement Configurable Log Retention Policy for Activity Logs (Default 180 days, Manual Trigger & Pruning Log)**
    * **As an** Administrator/System, **I want** to configure log retention (default 180 days, 0=forever via `SystemSetting.logRetentionDays`), have the system auto-prune old logs (via `node-cron`), log pruning to ActivityLog, and allow manual pruning trigger via UI/API. **So that** I manage log storage and have control over cleanup.
    * **Acceptance Criteria:**
        * `[ ]` (`SystemSetting` Schema Enhancement) `SystemSetting` model updated with `logRetentionDays (Integer, @default(180))`. `0` means keep indefinitely. Migration. Default record created if none exists.
        * `[ ]` (Admin UI for Log Retention) Section in admin page (e.g., Activity Log page or System Settings). Displays current policy. MUI `TextField` (number, min 0) or `Select` for `logRetentionDays` (options like "30d", "90d", "180d (Default)", "365d", "Keep Indefinitely (0)"). "Save Policy" `Button`. Confirmation dialog. API saves. Success/error `Snackbar`.
        * `[ ]` (Backend API for Policy) API (e.g., `PUT /api/admin/settings`) updates `logRetentionDays`. Validates non-negative int. `ADMIN` role.
        * `[ ]` (Automated Log Pruning - Scheduled Task) `node-cron` task runs periodically (e.g., daily 3 AM). Reads `logRetentionDays`. If > 0, calculates cutoff, `deleteMany` `ActivityLog` records older than cutoff. Efficient. Task logs its own execution to standard app logs. After successful pruning, task creates summary entry in `ActivityLog` table (e.g., `actionType: "SYSTEM_LOG_PRUNED"`, `actingUserName: "SYSTEM"`, `details: { entriesPruned: X, policyDays: Y }`).
        * `[ ]` (Manual Log Pruning Trigger) UI `Button` "Prune Logs Now" in Log Retention section. Confirmation dialog ("...prune according to current policy [details]?"). On confirm, calls new API `POST /api/admin/system/logs/prune-now` (`ADMIN` role). API executes pruning logic on demand (synchronous with UI loader for MVP). API response indicates success/failure/count. Manual pruning also logs to `ActivityLog`.
        * `[ ]` (Default Policy Application) Default `logRetentionDays: 180` ensures pruning if admin never configures.

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
*(Full prompt omitted for brevity, present in dialogue history)*

---

## 11. Initial Architect Prompt

**(This phase was completed. Key architectural decisions from the Architect (Alex) session have been integrated into relevant PRD sections like "Non-Functional Requirements," "Technical Assumptions," "Core Technical Decisions & Application Structure," and as guiding principles for story implementation.)**

**Original Prompt (for historical reference):**
Based on the comprehensive requirements detailed in this Product Requirements Document for the **ControlCenter** project, the following technical guidance, decisions, and assumptions should inform your architecture analysis and design when operating in "Architecture Creation Mode":
*(Full prompt omitted for brevity, present in dialogue history)*
