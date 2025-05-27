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
    * **Database Schema:** Prisma ORM with SQLite defining models for Users (with `isActive` status, `lastLoginAt`), URLs, Groups, URL-in-Group relationships, User-Group Access, User Settings, and Activity Logs.
    * **Authentication:**
        * User identification by unique `name` with an optional password.
        * NextAuth.js for credential-based login.
        * JWT-based session management with HTTP-only cookies.
        * Configurable session duration (default 1 week via env var) and "Remember Me" functionality for extended sessions.
        * Password hashing (e.g., bcryptjs).
        * Session includes user ID, name, role, `isActive` status, theme, and menu position preferences.
        * `User.lastLoginAt` updated on login.
        * `User.isActive` status checked during login; inactive users cannot log in.
    * **First Run Experience (for initial Admin setup):**
        * System detects "first run" state (single default admin user: `name: "admin"`, `role: ADMIN`, `lastLoginAt: null`, and is the only user).
        * Login page conditionally offers:
            * Option to restore application state from a backup file (UI trigger only for MVP, disabled, with tooltip; full backend restore via admin panel).
            * Option for the default 'admin' user to log in without a password.
        * After first passwordless admin login, mandatory password setup for the admin account.
        * "First run" state concludes after initial admin login and password setup.
    * **Authorization & Access Control:**
        * Role-based access (ADMIN/USER).
        * Protected routes (e.g., `/dashboard`, `/settings/*`, `/admin/*`) via Next.js middleware.
        * Middleware checks for authentication and `User.isActive` status; redirects to login if unauthenticated or inactive.
        * Client-side proactive session validation to check `session.user.isActive` and log out if false.

**II. User Interface - Global Elements:**
    * **Application Header (AppBar):**
        * Displays application logo/name (from branding settings).
        * Includes a User Menu button (avatar/name) on the right, providing dropdown access to:
            * Dashboard link.
            * User Settings link.
            * Admin Area link (conditional on ADMIN role).
            * Theme Toggle (Light/Dark/System - persists choice).
            * Logout button.
        * On mobile, includes a hamburger icon on the left to toggle the main navigation drawer.
        * Header structure adapts based on user's "Menu Position" preference (Top/Side) for desktop/tablet views.
            * If "Top Menu" (desktop default): AppBar hosts central area for URL/Group navigation.
            * If "Side Menu" (desktop): AppBar is hidden; all chrome moves to Side Navigation Panel.
            * Always visible on mobile.

**III. User Dashboard & URL Interaction:**
    * **Personalized Content Fetching:** API endpoint (`/api/dashboard/urlGroups`) for authenticated users to fetch their accessible URL Groups and contained URLs (ordered, with effective titles, global favicons).
    * **Desktop "Top Menu" Navigation (User Preference):**
        * Interactive "hover-to-expand" menu in AppBar's central area.
        * Normal state: displays current group name + its horizontal URL items.
        * Hover state: expands to show other groups + their URLs.
        * Clicking a URL updates selection and collapses expansion.
        * Responsive for tablets (condensed, scrollable URL rows, "more" button for overflow).
    * **Desktop "Side Menu" Navigation (User Preference):**
        * Persistent, full-height side panel on the left (replaces AppBar on desktop).
        * Contains: App Logo/Name (top), vertical accordion-style URL/Group navigation (middle), User Menu (bottom, styled as list/accordion).
        * Collapsible on desktop/tablet to an icons-only view (groups show initials, URLs show favicons, tooltips on hover) via a toggle button in the panel.
    * **Mobile Navigation (Always Drawer-based):**
        * Hamburger icon in AppBar toggles a left-side drawer.
        * Drawer contains URL/Group navigation (accordion style: groups expand to show URLs).
        * Selecting a URL closes the drawer.
    * **URL Item Visual State Indicators (Universal):**
        * Opacity `0.5` for "unloaded" URLs.
        * Opacity `1.0` for "loaded" URLs (iframe content has been loaded, even if hidden).
        * Blue underline (Top Menu) or blue right border (Side Menu/Mobile Drawer) for the currently "active" (visible iframe) URL.
    * **Multi-Iframe Management & Display:**
        * One iframe per unique URL, kept mounted in DOM.
        * CSS `visibility: hidden` (and `position: absolute; left: -9999px;`) for inactive iframes to preserve state; `visibility: visible` for active iframe.
        * `src`/`data-src` pattern for iframe loading: `src` set from `data-src` to load; `src=""` to unload.
        * Core client-side state management (`IframeProvider`, `useIframeManager` hook) tracks active URL and loaded/unloaded status of all interacted-with iframes.
    * **Iframe Interaction:**
        * Initial dashboard load automatically loads the first URL of the first accessible group.
        * Single click on URL item: Activates it (loads if unloaded using `src` from `data-src`, makes visible). If already active & loaded, reloads its content.
        * Long press (2 seconds) on URL item: Unloads its iframe content (sets `src=""`, updates state to "unloaded"). Visual progress bar on item during press. Haptic feedback on mobile.
        * If active URL is unloaded: iframe area shows "Content Unloaded" message + "Reload Content" button.
    * **Basic Iframe State Indicators (for iframe area):** Loading spinner/text when iframe loads; error message if iframe content fails to load.
    * **UI Feedback:** Broken favicons in URL lists revert to showing title. Neutral UI if no groups are assigned (console log for dev). Selected group state persists during current session.

**IV. User Settings (Self-Service):**
    * **Profile Page (`/settings/profile`):**
        * View read-only login `name`.
        * Change password (current, new, confirm; basic complexity: min 8 chars).
        * Upload/Remove avatar (JPG/PNG/GIF, max 1MB; server-hosted in `/public/avatars/`, path in `User.avatarUrl`). Old avatar file overwritten/deleted.
    * **Layout & Appearance Preferences:**
        * Choose preferred menu position (Top/Side for desktop), persisted in `UserSetting` table.
        * Choose preferred theme (Light/Dark/System), persisted in `UserSetting` table.
        * Changes apply immediately.

**V. Administrator Functions (Admin Dashboard - `/admin/*` routes):**
    * **Layout:** Basic admin dashboard layout with navigation.
    * **User Management:**
        * List all users (name, role, avatar, status, dates).
        * Create new users (name, role; `passwordHash` is null initially).
        * Edit existing users' login `name` (ensuring uniqueness).
        * Edit existing users' `role` (ADMIN/USER), with safeguard for sole admin.
        * Disable/Enable user accounts (`User.isActive` flag). Disabling prevents login and invalidates active sessions via middleware/client checks.
        * Confirmation dialogs for critical actions.
    * **URL Group Management (Admin UI):**
        * Create, list (sorted by `displayOrder` then `name`), update (name, description, displayOrder), and delete URL Groups.
        * Confirmation dialogs for create/update/delete.
    * **URL Management within Groups (Admin UI):**
        * Add existing global URLs to a selected group.
        * Create new global URLs to add to a group (API attempts best-effort icon auto-fetch from URL; admin can override by uploading custom icon). UI shows auto-fetched icon preview and feedback on fetch success/failure.
        * UI handles duplicate `originalUrl` errors from API gracefully (shows message with existing URL's title).
        * Remove URLs from a group.
        * Reorder URLs within a group (`UrlInGroup.displayOrderInGroup`).
        * Edit `UrlInGroup.groupSpecificTitle`.
        * Manage global `Url.faviconUrl` (view current, trigger re-check for auto-discovered icon, upload custom icon to `/public/url_favicons/`, remove custom icon). Standard limits for icon uploads.
        * Confirmation dialogs.
    * **Application Branding Management:**
        * Customize application name, upload logo, upload favicon (persisted in `SystemSetting`, files in `/public/branding/`).
        * Confirmation dialogs.
    * **User Registration Control:**
        * Admin can toggle a system setting to allow/disallow creation of new users by admins (default: enabled).
        * Confirmation dialog.
    * **System Operations (Backup & Restore):**
        * **Backup:** Asynchronous API to create full backup (`.zip` archive: SQLite DB, all uploaded assets, manifest file with DB schema version & app version). UI to initiate backup, get "initiated" toast, refresh backup list.
        * **Backup File Management:** API & UI to list existing backup files from server (name, date, size), download a backup, delete a backup (with confirmation).
        * **Restore:** Asynchronous API to restore from an uploaded `.zip` backup. Backend validates archive, reads manifest, restores DB then runs Prisma migrations, then restores assets. UI suggests creating fresh backup before restore, handles file upload, shows stern confirmation, gives "initiated" toast, expects app restart/re-login.
    * **System Statistics Display:**
        * Admin dashboard section shows: Total Users, Total Groups, Total Global URLs. Data via API. Read-only. Optional refresh button.
    * **User Activity Tracking Log:**
        * `ActivityLog` Prisma model (stores timestamp, actor, action, structured `details` as JSON, target, success).
        * Backend service to log key actions (logins, admin CRUD on users/groups/URLs, branding, B/R, user settings changes, system log pruning).
        * Admin UI to view paginated activity log (reverse chronological). Basic client-side search on displayed data if MUI table supports easily.
    * **Configurable Log Retention:**
        * Admin can configure log retention period (default 180 days, 0=forever) via UI (persisted in `SystemSetting`).
        * Backend scheduled task (`node-cron`) automatically prunes old logs.
        * Pruning action itself is logged to Activity Log.
        * Admin can manually trigger log pruning via UI button/API.
        * Confirmation dialogs.

---

## 3. Non-Functional Requirements (MVP)

* **Performance:**
    * Application UI should load quickly and feel "snappy" during interactions.
    * Iframe loading performance is dependent on external sites but should be handled gracefully by ControlCenter (loading indicators, error messages).
* **Usability:**
    * "Nice, clean, modern UX look and feel" with "easy access" to features.
    * Intuitive navigation. Clear visual feedback for actions.
    * Desktop/tablet first design approach, with fully functional responsive mobile experience (optimized layouts, e.g., adaptive/collapsible menus).
* **Security:**
    * Standard input sanitization for all user-provided data (e.g., URL titles, group names) to prevent XSS.
    * Secure session management via NextAuth.js (JWT, HTTP-only cookies).
    * Role-based access control for admin functions.
    * Passwordless login for new users (admin-created) and initial admin; users set their own passwords thereafter. Password complexity for self-set passwords: minimum 8 characters for MVP.
* **Reliability:**
    * High availability for home use (designed for 24/7 operation on local server).
    * Data integrity for all user data, URLs, groups, and settings.
    * Backup and restore functionality to prevent data loss.
    * Graceful error handling in UI and API.
* **Maintainability:**
    * Adherence to defined tech stack (Next.js, TypeScript, Prisma, MUI).
    * Code quality following best practices (DRY, ESLint, Prettier, Conventional Commits).
    * Logical project structure and well-commented code where necessary for readability and future expansion.
* **Accessibility:**
    * Basic accessibility considerations for MVP (e.g., semantic HTML where possible, aiming for reasonable color contrast in default themes).
    * Comprehensive accessibility (e.g., WCAG AA) is a post-MVP goal.

---

## 4. User Interaction and Design Goals

* **Overall Vision & Experience:**
    * The UI and overall experience should be: simple, focused, clean, uncluttered, and easy to understand, embodying a "nice clean modern UX look and feel." The application should feel efficient and intuitive.
* **Key Interaction Paradigms:**
    * **Dashboard URL Interaction (Epic 4):** User interaction with URL menu items will involve single-click (activate/load/reload) and long-press (unload with progress bar and haptic feedback). URL menu items will show visual states (opacity for loaded/unloaded, underline/border for active).
    * **URL/Group Management (Admin):** Primarily via forms, tables, and dialogs within the admin panel. Batch operations for URL/group associations are admin-focused.
    * **Menu Navigation:**
        * Desktop: User-selectable preference (Top Menu or Side Menu).
            * Top Menu: Hover-to-expand "mega menu" style within the AppBar for group and URL selection.
            * Side Menu: Persistent full-height left panel with accordion groups, User Menu at bottom; top AppBar is hidden. Collapsible to icons-only.
        * Mobile: Always a collapsible left-side drawer (accordion groups/URLs) toggled by a hamburger icon in a persistent top AppBar.
* **Core Screens/Views (Conceptual for MVP):**
    * **Login Screen:** Tile-based UI displaying user profiles. Clicking a tile either logs in (passwordless) or reveals an in-tile password form. During "first run," offers conditional options (restore from backup (UI trigger only for Epic 1), or passwordless admin login).
    * **Main Dashboard (`/dashboard`):** Primary workspace. Displays the chosen navigation menu (Top or Side on desktop; Drawer on mobile) for accessing URL Groups and URLs. Contains the main iframe display area.
    * **User Settings (`/settings/profile`):** For self-service profile management (password, avatar) and layout/appearance preferences (menu position, theme).
    * **Admin Area (`/admin/*`):** Comprehensive section for administrators, including:
        * Admin Dashboard/Overview (with stats).
        * User Management (list, create, edit name/role, disable/enable).
        * URL & Group Configuration (global URLs, groups, URLs within groups, icon management).
        * Application Branding.
        * Registration Control settings.
        * System Operations (Backup/Restore).
        * Activity Log.
        * Log Retention Policy settings.
    * **First Run Admin Password Setup Page (`/first-run/set-admin-password`):** Modal page for initial admin to set their password after first passwordless login.
* **Accessibility Aspirations (MVP):**
    * Adherence to best practices regarding color contrast in default light and dark themes.
    * Strive for reasonable keyboard navigation for core tasks where MUI provides it by default.
* **Branding Considerations (MVP):**
    * Application defaults to clean light and dark themes. "System" theme option respects OS preference.
    * Admin can customize application name, logo, and favicon.
    * Theming engine designed to easily accommodate additional themes later.
* **Target Devices/Platforms:**
    * Primarily a web application. Design process prioritizes desktop and horizontal tablet views, then adapts for fully functional responsive mobile (vertical orientation).

---

## 5. Technical Assumptions

* **Repository & Service Architecture:**
    * **Repository Structure:** Monorepo. Next.js application handles both frontend and backend (API) functionalities.
    * **Service Architecture:** Monolith. Next.js serves as the unified environment for both frontend and backend logic.
    * **Rationale:** Simplicity for development, deployment, and management for a personal application designed for home use with limited users.
* **Languages, Frameworks, & Libraries:**
    * Core tech stack is pre-defined (see Section 6).
    * No additional major external APIs or third-party services anticipated for MVP beyond those inherent to the stack or for icon auto-discovery.
* **Starter Templates & Existing Code:**
    * Built upon an existing bootstrapped repository prepared by the user.
* **Testing Requirements:**
    * Unit, Component, and Integration Testing: Vitest with React Testing Library, MSW for API mocking, Happy DOM.
    * End-to-End (E2E) Testing: Playwright.
    * Test Coverage: No specific percentage targets for MVP; to be assessed post-MVP.
    * Manual Testing: Ad-hoc during development; specific scripts TBD if needed.

---

## 6. Core Technical Decisions & Application Structure

This section captures essential technical foundations.

**1. Technology Stack Selections:**
* **Frontend:**
    * Next.js 15.2.2 (with App Router)
    * React 19
    * TypeScript 5
    * Material UI (MUI) v6
    * Emotion (for styling, typically with MUI)
* **Backend:**
    * Next.js API Routes
    * Prisma ORM v6.5.0
    * NextAuth.js v4 (for authentication)
    * JWT (for token management, managed by NextAuth.js)
* **State Management (Client-Side):**
    * React Context and Hooks (including for Iframe State Management and User Settings).
* **Database:**
    * Prisma ORM v6.5.0
    * SQLite (for local server deployment).
* **Testing:**
    * Vitest
    * React Testing Library
    * MSW (Mock Service Worker)
    * Happy DOM
    * Playwright (for E2E)
* **Development Tooling & Practices:**
    * ESLint v9 (with TypeScript support)
    * Prettier (for code formatting)
    * Husky (for git hooks)
    * Conventional Commits (with commitlint)
    * Docker (for containerization)

**2. Database System:**
* **ORM:** Prisma ORM v6.5.0
* **Database Engine:** SQLite
    * *Rationale:* Simplicity, file-based nature, ease of setup and backup for a locally hosted, personal application.

**3. Deployment and Operational Environment:**
* **Containerization:** Docker.
* **Deployment Platform:** Local home server (running the Docker container, serving the Next.js app and hosting the SQLite database file).
* **Cloud Services:** None anticipated for MVP core functionality beyond potential needs for NextAuth.js OAuth providers (if any are used beyond credentials) or if icon auto-discovery hits external services.

**4. Application Directory Structure:**
    ```
    /app/               # Next.js App Router root
    ├── admin/            # Admin area pages and components
    ├── api/              # API routes for data access
    ├── components/       # Shared UI components
    ├── contexts/         # React contexts for state sharing (e.g., IframeProvider, ThemeProvider, UserSettingsProvider)
    ├── dashboard/        # Main dashboard pages
    ├── lib/              # App-specific utilities (e.g., hooks like useIframeManager, useLongPress)
    ├── login/            # Authentication pages
    ├── providers/        # Wrapper for app providers (authentication, theme, etc.)
    ├── settings/         # User settings pages (e.g., profile)
    ├── first-run/        # Pages related to first-run specific flows (e.g., set admin password)
    ├── theme/            # Theme configuration (MUI theme objects)
    ├── types/            # TypeScript type definitions
    ├── layout.tsx        # Root layout component (hosts AppBar/SidePanel from Story 3.8/4.4)
    ├── page.tsx          # Root page component (e.g., redirect to login or dashboard)
    └── globals.css       # Global CSS styles

    /lib/                 # Project-level utilities (server-side or shared)
    ├── db/               # Prisma client instance, seeding scripts, DB utilities
    └── archive.ts        # Utilities for backup/restore archive handling (zip/unzip)
    └── activityLogger.ts # Utility for creating activity log entries

    /prisma/              # Prisma ORM schema and migrations
    ├── migrations/       # Database migration files
    └── schema.prisma     # Database schema definition

    /scripts/             # Build and utility scripts (e.g., cleanup-dev.ts, seed-test-data.ts)

    /public/              # Static assets
    ├── avatars/          # User uploaded avatars
    ├── url_favicons/     # Admin uploaded URL-specific favicons
    ├── branding/         # Admin uploaded app logo/favicon
    └── (other static assets like default images)

    /data/                # Data storage directory (NOT publicly accessible)
    ├── controlcenter.db  # SQLite database file
    ├── backups/          # Backup archives

    /__tests__/           # Test directory (Vitest tests, MSW setup)
    ```

**5. Repository Structure:**
* Monorepo.

---

## 7. Epic Overview & Detailed User Stories

### Epic 1: Foundational Setup & Core User Authentication
**Goal:** Establish the initial project structure, database schema for users (including `isActive` status and `lastLoginAt`), implement robust user authentication for the initial admin (including the defined "First Run" experience with conditional login options and mandatory password setup), secure basic application access via middleware (checking `isActive`), and implement client-side session validation for `isActive` status.

**Story 1.1: Initialize Next.js Project with Core Tooling**
* **As a** Developer/System Maintainer,
* **I want** to ensure the foundational Next.js application is correctly set up using the pre-defined tech stack (Next.js 15.2.2, TypeScript 5), including essential development tools (ESLint v9, Prettier), version control enhancements (Husky, commitlint), and basic Docker containerization,
* **So that** we have a runnable, linted, formatted, and containerizable application skeleton, confirming the existing bootstrapped repository meets these standards and provides a consistent development environment for ControlCenter.
* **Acceptance Criteria:**
    * `[ ]` The existing bootstrapped Next.js (version 15.2.2) project utilizes the App Router.
    * `[ ]` The project successfully starts in development mode (e.g., via `npm run dev` or `yarn dev`) without errors.
    * `[ ]` The project's root directory structure aligns with the agreed-upon layout (including stubs for `/app`, `/lib`, `/prisma`, `/scripts`, `/public`, `/data`, `/__tests__`).
    * `[ ]` TypeScript (version 5) is correctly configured and integrated.
    * `[ ]` The project compiles successfully using `tsc` (e.g., as part of `npm run build`) without TypeScript errors.
    * `[ ]` A `tsconfig.json` file is present with appropriate strictness settings.
    * `[ ]` ESLint (version 9) is installed and configured with TypeScript/Next.js support. An ESLint configuration file is present.
    * `[ ]` Prettier is installed and configured. A Prettier configuration file is present.
    * `[ ]` NPM/Yarn scripts (e.g., `lint`, `format`) successfully run ESLint and Prettier, reporting no errors on initial setup.
    * `[ ]` Husky is installed and configured for git hooks.
    * `[ ]` A pre-commit hook via Husky runs ESLint and Prettier on staged files.
    * `[ ]` `commitlint` is installed/configured with `@commitlint/config-conventional`. A `commitlint.config.js` is present.
    * `[ ]` A `Dockerfile` is present, builds a runnable Docker image. A `.dockerignore` file is configured.
    * `[ ]` A `README.md` file exists with project name and basic setup/run instructions.

**Story 1.2: Integrate Prisma ORM and Define Initial User Schema**
* **As a** Developer/System,
* **I want** to integrate Prisma ORM (v6.5.0) into the Next.js project, configure it to use an SQLite database, and define the initial `User` schema including `name` as identifier, optional passwords, a `lastLoginAt` field, and an `isActive` status flag, with appropriate referential actions for related entities if a user is deleted.
* **So that** the application has robust data persistence for users, supporting authentication, activity tracking, and account status management.
* **Acceptance Criteria:**
    * `[ ]` Prisma CLI & Client (v6.5.0 compatible) installed. Prisma initialized (`/prisma` directory, `schema.prisma`).
    * `[ ]` `schema.prisma` configured for `sqlite` provider and `DATABASE_URL` (e.g., `file:../data/controlcenter.db`). `/data` directory exists.
    * `[ ]` `User` model defined in `schema.prisma` with:
        * `id` (String, `@id @default(cuid())`)
        * `name` (String, `@unique`)
        * `passwordHash` (String, Optional `?`)
        * `avatarUrl` (String, Optional `?`)
        * `role` (`UserRole` enum: USER, ADMIN; `@default(USER)`)
        * `lastLoginAt` (DateTime, Optional `?`)
        * `isActive` (Boolean, `@default(true)`)
        * `createdAt` (DateTime, `@default(now())`)
        * `updatedAt` (DateTime, `@updatedAt`)
        * Relations: `addedUrls: Url[] @relation("AddedUrls")`, `createdGroups: Group[] @relation("CreatedGroups")`, `groupAccesses: UserGroupAccess[]`, `settings: UserSetting?` (UserSetting from Story 4.1).
    * `[ ]` `UserRole` enum (`USER`, `ADMIN`) defined.
    * `[ ]` Prisma migration generated and applied successfully, creating/altering tables. Migration files in `/prisma/migrations`.
    * `[ ]` Prisma Client successfully (re)generated and usable. Basic CRUD on `User` table (including `isActive`, `lastLoginAt`) is functional.
    * `[ ]` Mechanism to seed a default 'admin' user (`name: "admin"`, `role: ADMIN`, `isActive: true`, `lastLoginAt: null`) if one doesn't exist. (Also creates their `UserSetting` record with defaults - see Story 4.1).

**Story 1.3: Implement NextAuth.js for Core Authentication Logic**
* **As a** Developer/System,
* **I want** to integrate and configure NextAuth.js (v4) to handle user authentication using the `name` field and an optional password, check for account `isActive` status, leverage the Prisma adapter, establish JWT-based session management with HTTP-only cookies, support configurable session durations, include "Remember Me" functionality, and include the `isActive` status and user preferences (theme, menuPosition from Story 4.1) in the session.
* **So that** ControlCenter has a secure, robust, and flexible core mechanism for authenticating users and managing their sessions, ensuring only active accounts can log in and maintain sessions, and user preferences are readily available.
* **Acceptance Criteria:**
    * `[ ]` `next-auth` (v4.x) and `@next-auth/prisma-adapter` installed.
    * `[ ]` NextAuth.js API route (e.g., `/app/api/auth/[...nextauth].ts`) configured with `secret` (env var) and `session` strategy `jwt`.
    * `[ ]` `@next-auth/prisma-adapter` correctly configured with Prisma Client.
    * `[ ]` `Credentials` provider configured. `authorize` function:
        * Accepts `name` and `password` (can be empty/null).
        * Finds user by `name`.
        * Verifies `User.isActive` is `true`. If `false`, auth fails.
        * If `isActive`: validates optional `password` against `passwordHash` (if set) or allows passwordless login if `passwordHash` is null and no password provided.
        * Returns user object (`id`, `name`, `role`, `isActive`, and any fields needed for session preferences like from `UserSetting`) on success.
    * `[ ]` JWT & Session callbacks (`jwt`, `session`) configured:
        * `jwt` callback includes `id`, `name`, `role`, `isActive` status, `theme`, `menuPosition` in JWT.
        * `session` callback exposes these details (e.g., `session.user.id`, `name`, `role`, `isActive`, `theme`, `menuPosition`) to client.
        * Considers "Remember Me" flag to influence session/token expiry.
    * `[ ]` Session cookies are HTTP-only. Default session `maxAge` (1 week via env var). Extended `maxAge` if "Remember Me" (30 days via env var).
    * `[ ]` Secure password hashing library (e.g., `bcryptjs`) used for comparison.
    * `[ ]` Authentication flow verifiable. Login for `isActive: false` user rejected. `useSession()` retrieves session data including `isActive` and preferences.
    * `[ ]` `User.lastLoginAt` field updated on successful login.

**Story 1.3.5: Create API Endpoint to List User Tiles**
* **As the** Login Page,
* **I want** to fetch a list of user profiles, formatted specifically for display as interactive login tiles (including username, avatar, password requirement status, admin status, and last login time), ordered by user creation date by default, with dates provided as ISO strings in the JSON response.
* **So that** I can present users with a visual, intuitive, and consistently ordered way to select their profile and initiate the login process, and the frontend can format dates as needed.
* **Acceptance Criteria:**
    * `[ ]` API route at `/app/api/auth/user-tiles/route.ts` handles GET requests.
    * `[ ]` Fetches all `User` records via Prisma, ordered by `createdAt` ascending ("newest last" means older created users appear first).
    * `[ ]` Transforms each `User` into `UserTile`: `{ id, username (from User.name), avatarUrl, requiresPassword (bool based on User.passwordHash), isAdmin (bool based on User.role), lastLoginAt? (ISO string from User.lastLoginAt) }`.
    * `[ ]` Returns JSON array of `UserTile` objects (200 OK). Empty array if no users. Handles errors (500).
    * `[ ]` Endpoint is publicly accessible.

**Story 1.4: Develop Rich Interactive Tile-Based Login Page UI**
* **As an** End User,
* **I want** to interact with a visually rich, tile-based login page that displays user profiles fetched from the system, allows selection of my profile via mouse or keyboard, provides a "Remember Me" option, and seamlessly handles login for both passwordless users (immediate login) and users requiring a password (via an animated, in-tile password form).
* **So that** I can securely and intuitively log into ControlCenter with an engaging, efficient, and modern experience.
* **Acceptance Criteria:**
    * *(Page Setup & Data Fetching)* `/login` page. Authenticated users redirected to `/dashboard`. Fetches user tiles from `/api/auth/user-tiles`. Loading/error/empty states handled.
    * *(User Tile Grid Display)* Responsive grid (MUI `Grid`: 4/row desktop, 2/tablet, 1/mobile) of user tiles (MUI `Card` like).
    * *(Individual User Tile Visuals)* Displays `username`, avatar (or initials fallback from `User.name`), optional avatar as tile background, visual indicator for password-protected accounts, gradient overlay.
    * *(User Tile Interaction - Login Flow)* Hover effects (elevation). Clicking passwordless tile: immediate `signIn` (with "Remember Me" state). Clicking password-protected tile: transforms tile (avatar shrinks, username moves, password form slides up) to show in-tile password form. Only one tile selected at a time.
    * *(In-Tile Password Form)* MUI `TextField` for password, submit button, password visibility toggle. "Remember Me" MUI `Checkbox` displayed. Submitting calls `signIn` with username, password, and "Remember Me" state. Error message in-tile on failure (password field cleared, name retained).
    * *(Visual Design, Animations & Transitions)* Smooth animations (300ms standard) for tile hover, selection, transformation for password form. Card-based design. Visual feedback.
    * *(Accessibility)* Full keyboard navigation for tiles (arrow keys, responsive grid aware), tiles activatable (`Enter`/`Space`). Focus moves to password field. In-tile form elements keyboard accessible. `Escape` key cancels password entry, hides form, returns focus to tile. ARIA labels/roles.
    * *(Performance)* Memoized handlers/calculations, optimized rendering (`React.memo` for tiles), event listener cleanup.
    * *(Integration with Story 1.5)* Structured to allow conditional UI for "First Run".

**Story 1.5: Implement "First Run" Experience on Login Page**
* **As an** Initial Administrator,
* **I want** to be presented with special options on the tile-based login page when the application is in a "first run" state (defined by a single default admin user existing who has never logged in), allowing me to either see a (currently disabled for Epic 1) option to restore from backup, or to log in as the default 'admin' without a password to complete initial setup, including setting a mandatory password for the admin account.
* **So that** I can easily and securely perform the initial setup of the ControlCenter application and establish the primary admin credentials.
* **Acceptance Criteria:**
    * *(First Run State Determination)* Login page determines "first run" status (server-side logic: exactly one user, `name=="admin"`, `role==ADMIN`, `lastLoginAt==null`). Status stored in page state.
    * *(Conditional UI for "Restore from Backup")* If "first run": "Restore System from Backup" MUI `Button` displayed, but **disabled**. Tooltip: "Full restore functionality will be enabled with Admin features." No restore action in Epic 1.
    * *(Conditional UI & Interaction for 'Admin' Tile)* If "first run": 'admin' user tile is distinct. Clicking it presents "Login & Setup Admin Account" option (bypasses password form).
    * *(Passwordless Admin Login Process)* Activating "Login & Setup" calls `signIn` for 'admin' (passwordless for first run). `authorize` function (Story 1.3) allows this if backend confirms first run state for this admin. `User.lastLoginAt` updated.
    * *(Mandatory Admin Password Setup)* After passwordless first-run login, admin redirected to `/first-run/set-admin-password` page. Form for "New Password", "Confirm New Password" (MUI, validation for match & min 8 chars). Submit calls `POST /api/first-run/set-admin-password`. Backend verifies user, hashes password, updates `User.passwordHash`. Redirect to `/dashboard` on success. Access to other app parts restricted until password set.
    * *(Conclusion of "First Run" UI State)* After `User.lastLoginAt` is updated, subsequent visits to `/login` no longer show "first run" UI. 'Admin' tile now prompts for password (set in AC 5.3).

**Story 1.6: Implement Basic Protected Routes, Middleware, and Client-Side Session Validation**
* **As the** System,
* **I want** to secure specific application routes using Next.js middleware that checks user session status and account `isActive` state, and implement a client-side mechanism to proactively validate session activity.
* **So that** sensitive application content is protected, only active users can maintain access, and the user experience is responsive to changes in account status.
* **Acceptance Criteria:**
    * *(Middleware Implementation)* Next.js middleware file created. `matcher` configured for protected routes (e.g., `['/dashboard/:path*', '/settings/:path*', '/admin/:path*']`).
    * *(Session & Account Status Checking in Middleware)* Middleware retrieves session/token. Verifies user is authenticated AND `token.isActive` is `true`.
    * *(Redirection for Unauthenticated or Inactive Users)* If unauth or `token.isActive === false`, redirect to `/login` with `callbackUrl`.
    * *(Access for Authenticated & Active Users)* If auth and `token.isActive === true`, request proceeds.
    * *(Exclusion of Public/Auth Routes)* `/login`, `/api/auth/**`, `/api/auth/user-tiles` not blocked.
    * *(Client-Side Proactive Session Validation)* Logic in global client component (e.g., root `layout.tsx`): uses `useSession()`. On load/triggers, checks `session.user.isActive`. If `false` while authenticated, calls `signOut({ callbackUrl: '/login' })`.
    * *(Role-Based Authorization Note)* Code comment for future role-based checks in middleware.
    * *(Verification)* Manual/automated tests for redirection and access based on auth and `isActive`. Client-side proactive logout verified.

---
### Epic 2: Admin Dashboard - Core Administration & Multi-User Setup
**Goal:** Provide administrators with tools to manage essential application settings (branding), control user registration, create and manage other user accounts (defining admin/user roles, including disabling accounts), and enable all users (including the initial admin) to manage their own profiles (avatar support). This establishes core administrative functions and enables multi-user scenarios.

**Story 2.1: Create Basic Admin Dashboard Layout and Navigation**
* **As an** Administrator,
* **I want** to access a dedicated and secure `/admin` section within ControlCenter that has a consistent layout and a basic navigation structure for administrative functions.
* **So that** I have a clear, organized, and protected entry point to manage the application, users, and system settings.
* **Acceptance Criteria:**
    * *(Admin Route Protection)* `/admin/*` routes require `ADMIN` role. `USER` role redirected to `/dashboard` with "Not Authorized" message. Unauth redirected to `/login`. Middleware (Story 1.6) or page-level checks.
    * *(Admin Dashboard Layout)* Dedicated layout (e.g., `/app/admin/layout.tsx`) using MUI: persistent admin navigation (sidebar/top bar), main content area. Responsive.
    * *(Basic Admin Navigation Menu)* Placeholder links for: "Dashboard/Overview" (`/admin`), "User Management", "Application Branding", "Settings" (for Registration Control), "System Operations", "Monitoring". Clicking leads to placeholder "Coming Soon" pages within admin layout. Active section indicated.
    * *(Admin Area Landing Page)* Base `/admin` route renders basic landing page ("ControlCenter Administration") using admin layout.
    * *(Visual Consistency)* Clean, professional, uncluttered, uses app themes.

**Story 2.2: Implement User Profile Management (Self-Service)**
* **As an** Authenticated User (including Administrators viewing their own profile),
* **I want** to be able to view my profile information (including my read-only login name), update my password, and upload or change my avatar image.
* **So that** I can personalize aspects of my account, maintain its security, and control how I am represented within the ControlCenter application.
* **Acceptance Criteria:**
    * *(Profile Page UI & Access)* "/settings/profile" page, protected. Only current user access. Displays read-only login `name`, current avatar (or fallback). MUI, responsive, themed.
    * *(Password Change)* "Change Password" section. MUI `TextFields` for "Current Password" (if set), "New Password", "Confirm New Password" (masked, visibility toggle). Client validation: new passwords match, min 8 chars. Submit calls `POST /api/user/profile/change-password`. Backend verifies current password (if set), hashes new, updates `User.passwordHash`. Success/error messages (MUI `Snackbar`/`Alert`).
    * *(Avatar Upload & Management)* Displays current avatar. "Upload/Change Avatar" MUI `Button` triggers file input (`image/jpeg`, `image/png`, `image/gif`). Client validation (type, max 1MB). Optional preview. Confirm upload calls `POST /api/user/profile/avatar` (FormData). Backend validates, saves image to `/public/avatars/[userId].[ext]` (overwrites old), updates `User.avatarUrl`. UI updates. "Remove Avatar" option calls `DELETE /api/user/profile/avatar`, sets `User.avatarUrl` to null, deletes server file, UI shows fallback.
    * *(Backend API Endpoints)* Secure APIs under `/api/user/profile/` for change password, upload/remove avatar. User-specific operations only. Validation, success/error JSON responses.

**Story 2.3: Implement Admin User Management (List, Create, Edit Roles/Names, Disable/Enable Accounts)**
* **As an** Administrator,
* **I want** to be able to view a list of all users, create new user accounts (specifying their name and role, with users expected to set their own passwords later), edit existing users' login names (ensuring uniqueness) and roles, and disable or re-enable user accounts to control their login access.
* **So that** I can effectively manage the user base, their primary login credentials, their access permissions, and their account active status within ControlCenter.
* **Acceptance Criteria:**
    * *(User Management Page)* `/admin/users` page, admin layout, `ADMIN` role only.
    * *(User List Display)* MUI `Table`/`List` of all users: `id`, login `name`, `role`, avatar (or fallback), `lastLoginAt` (formatted), `createdAt` (formatted), `isActive` status ("Active"/"Disabled" or MUI `Chip`). No pagination for MVP. Optional client/server sort by name, role, isActive.
    * *(Create New User)* MUI `Button` opens `Dialog`/form. Fields: `name` (required), `role` (USER/ADMIN, default USER). No password field. Client validation for `name`. Confirmation dialog: "Are you sure you want to create user '[name]' with role '[role]'? They will log in passwordlessly initially." On confirm, `POST /api/admin/users`. Backend: verifies admin, unique `name`, creates `User` (`passwordHash: null`, `isActive: true`). List updates. Success/error `Snackbar`.
    * *(Edit User `name`)* "Edit" action per user. Modal/form pre-filled. Admin edits `name`. Client validation. Confirmation dialog: "Are you sure you want to change login name for '[current_name]' to '[new_name]'?". On confirm, `PUT /api/admin/users/[userId]`. Backend: verifies admin, unique new `name` (if changed). Updates `User.name`. List updates. Success/error messages. Feedback about login name change.
    * *(Edit User `role`)* In same "Edit" modal/form, admin changes `role`. Confirmation: "Are you sure you want to change role for '[name]' to '[new_role]'?". On confirm, `PUT /api/admin/users/[userId]`. Backend: verifies admin. Safeguard: admin cannot change own role to `USER` if sole active `ADMIN`. Updates `User.role`. List updates. Success/error.
    * *(Disable/Enable User Account)* In "Edit" modal or list row (MUI `Switch` or `IconButton` "Disable"/"Enable"). UI reflects `isActive`. Confirmation: "Are you sure you want to [disable/enable] account for '[name]'?". On confirm, `PUT /api/admin/users/[userId]` (updates `isActive`). Backend: verifies admin. Safeguard: admin cannot disable own account if sole active `ADMIN`. Updates `User.isActive`. List updates. Success/error. Disabled user cannot login (Story 1.3) & sessions invalidated (Story 1.6).
    * *(Backend API Endpoints)* Secure APIs under `/api/admin/users`: `GET /` (list users, incl. `isActive`), `POST /` (create: name, role; `passwordHash: null`, `isActive: true`), `PUT /[userId]` (update name, role, `isActive`). Admin only, validations, safeguards.

**Story 2.4: Implement Application Branding Management (Revised with Confirmation Dialogs)**
* **As an** Administrator,
* **I want** to be able to customize the application's displayed name, upload a custom logo image, and upload a custom favicon image through the admin dashboard, with confirmations before changes are applied.
* **So that** I can personalize the appearance of my ControlCenter instance to reflect specific branding or preferences.
* **Acceptance Criteria:**
    * *(Branding Management Page)* `/admin/branding` page, admin layout, `ADMIN` role only. Displays current branding, forms/inputs to change.
    * *(Application Name Customization)* MUI `TextField` for "Application Name", pre-filled. "Save Branding Settings" button. Confirmation dialog: "Are you sure... update branding settings?". On confirm, API saves name (persisted backend). Success message. App name (title/header) dynamically updates.
    * *(Logo Image Upload)* "Application Logo" section shows current logo/placeholder. MUI `Button` "Upload New Logo" (JPG, PNG, SVG). Client validation (type, max 1MB). Optional preview. Saving branding triggers API upload. Backend validates, saves to `/public/branding/logo.[ext]` (overwrites), stores path. UI/app logo updates. "Remove Custom Logo" option (with confirmation) reverts to default.
    * *(Favicon Image Upload)* "Application Favicon" section. MUI `Button` "Upload New Favicon" (ICO, PNG). Client validation (type, dimensions e.g. 32x32, size e.g. max 100KB). Saving branding triggers API upload. Backend validates, saves to `/public/favicon.ico` (or similar), stores path/flag. Browser favicon updates (may need hard refresh). "Remove Custom Favicon" option (with confirmation) reverts to default.
    * *(Persistence & Application)* Branding settings (App Name, Logo path, Favicon path) in `SystemSetting` model (or new if not by Story 4.1). Defaults used if not set. App layout dynamically uses settings for `<title>`, `<link rel="icon">`.
    * *(Backend API Endpoints)* Secure APIs under `/api/admin/branding`: `GET /` (get settings), `POST /` or `PUT /` (update text settings, save paths, handle deletions), separate `POST` for file uploads (`/upload-logo`, `/upload-favicon`). Admin only, validations.

**Story 2.5: Implement User Registration Control Setting (Finalized with Confirmation)**
* **As an** Administrator,
* **I want** to be able to enable or disable the ability for new user accounts to be created by an administrator within the application via a setting in the admin dashboard, with a confirmation before the change is applied.
* **So that** I have clear control over the expansion of the user base and can prevent new user additions (even by other admins) when not desired.
* **Acceptance Criteria:**
    * *(Registration Control UI)* Section in admin settings (e.g. `/admin/settings` or `/admin/settings/users`). `ADMIN` role only. Displays current state ("Admin User Creation: Enabled/Disabled"). MUI `Switch` "Allow New User Creation by Admins."
    * *(Persistence, Retrieval, Confirmation)* Setting state (`logRetentionDays` in `SystemSetting` model from Story 5.6 should be `allowAdminUserCreation: Boolean @default(true)` in `SystemSetting` from Story 4.1 or new one). Toggle change -> Confirmation dialog: "Are you sure you want to [enable/disable] new user creation by admins?". On confirm, API saves new setting. Success `Snackbar`. Setting fetched/displayed correctly.
    * *(Effect of Setting)* If disabled: "Create New User" button (Story 2.3) hidden/disabled; backend API (`POST /api/admin/users`) rejects creation. If enabled: functionality is active.
    * *(Default State)* "Allow New User Creation by Admins" is **ENABLED** by default.
    * *(Backend API)* Existing system settings API (`GET /api/admin/settings`, `PUT /api/admin/settings`) extended for this boolean setting. Admin only.

---
### Epic 3: Core URL & Group Management with Basic Iframe Display
**Goal:** Enable administrators to create, manage, and organize URLs and groups. Enable all authenticated users to view groups/URLs assigned to them. Implement the basic functionality to display a selected URL within an iframe, including visual state indicators (opacity/underline for URL items) and refined display logic (broken favicons, empty states).

**Story 3.1: Define Core Content & Access Prisma Schemas (URLs, Groups, UserGroupAccess, UrlInGroup)**
* **As the** System/Developer,
* **I want** robust Prisma schemas defined for `Url` entities (storing URL details like original URL, a **required** title, and paths to server-hosted favicons), `Group` entities (for organizing URLs, with properties like a unique name and description), a `UrlInGroup` relation (to manage URLs within groups, including their display order and group-specific properties), and a `UserGroupAccess` relation (to link specific users to groups they are permitted to access), with appropriate referential actions (`onDelete: SetNull`) for user deletion concerning creator fields.
* **So that** the application has a clear, relational, and extensible database structure for managing all core content, its organization, user-specific access rights, and maintains integrity if creator/assigner users are deleted.
* **Acceptance Criteria:**
    * *(Schema Update)* `prisma/schema.prisma` updated with `Url`, `Group`, `UrlInGroup`, `UserGroupAccess` models. `User` model updated for relations.
    * *(`Url` Model)* `id`, `originalUrl (@unique)`, `title (String, required)`, `faviconUrl (String?)`, `notes (String?)`, `mobileSpecificUrl (String?)`, `createdAt`, `updatedAt`, `groups (UrlInGroup[])`, `addedByUserId (String?)`, `addedBy (User? @relation("AddedUrls", onDelete: SetNull))`.
    * *(`Group` Model)* `id`, `name (String @unique)`, `description (String?)`, `displayOrder (Int?)`, `createdAt`, `updatedAt`, `urls (UrlInGroup[])`, `accessibleToUsers (UserGroupAccess[])`, `createdByUserId (String?)`, `createdBy (User? @relation("CreatedGroups", onDelete: SetNull))`.
    * *(`UrlInGroup` Model)* `id`, `urlId`, `url` (relation, `onDelete: Cascade`), `groupId`, `group` (relation, `onDelete: Cascade`), `displayOrderInGroup (Int, default: 0)`, `groupSpecificTitle (String?)`, `addedToGroupAt`, `@@unique([urlId, groupId])`. (No `groupSpecificFaviconUrl`).
    * *(`UserGroupAccess` Model)* `id`, `userId`, `user` (relation, `onDelete: Cascade`), `groupId`, `group` (relation, `onDelete: Cascade`), `assignedAt`, `@@unique([userId, groupId])`.
    * *(Updates to `User` Model)* Includes relations: `addedUrls: Url[] @relation("AddedUrls")`, `createdGroups: Group[] @relation("CreatedGroups")`, `groupAccesses: UserGroupAccess[]`.
    * *(Migration & Client)* Prisma migration generated/applied. Client regenerated.

**Story 3.2: Implement Admin API Endpoints for CRUD Operations on URL Groups**
* **As an** Administrator,
* **I want** secure backend API endpoints at `/api/admin/urlGroups` to Create, Read (list all, sorted by `displayOrder` then `name`), Update (name, description, displayOrder), and Delete URL groups.
* **So that** I can centrally manage the library of URL groups.
* **Acceptance Criteria:**
    * *(API Structure & Security)* Routes under `/api/admin/urlGroups`, `ADMIN` role required.
    * *(Create Group: `POST /api/admin/urlGroups`)* Accepts `name` (req, unique), `description?`, `displayOrder?`. `createdByUserId` populated. Returns 201 with new Group. Handles errors.
    * *(List Groups: `GET /api/admin/urlGroups`)* Returns array of all Groups, sorted by `displayOrder` (ASC, nulls consistent), then `name` (ASC). Includes all relevant fields. Empty array if none.
    * *(Get Single Group: `GET /api/admin/urlGroups/[groupId]`)* Returns group or 404.
    * *(Update Group: `PUT /api/admin/urlGroups/[groupId]`)* Accepts `name?`, `description?`, `displayOrder?`. Validates unique `name` if changed. Returns updated Group or 404.
    * *(Delete Group: `DELETE /api/admin/urlGroups/[groupId]`)* Deletes Group. `UrlInGroup` and `UserGroupAccess` entries cascade delete. Returns 204/200 or 404.
    * *(Error Handling)* Consistent JSON errors and HTTP status codes.

**Story 3.3: Implement Admin API Endpoints for CRUD Operations on Global URLs (with Enhanced Icon Auto-Fetch)**
* **As an** Administrator,
* **I want** secure backend API endpoints to Create new global URL entries (system attempts auto-discover of best application icon/favicon, `title` required), Read all URLs (sorted by `title`), Update properties, and Delete URLs.
* **So that** I can manage the master URL library, with icon auto-discovery for convenience.
* **Acceptance Criteria:**
    * *(API Structure & Security)* Routes under `/api/admin/urls`, `ADMIN` role required.
    * *(Create URL: `POST /api/admin/urls`)* Accepts `originalUrl` (req, unique, valid URL), `title` (req), `faviconUrl?` (manual path), `notes?`, `mobileSpecificUrl?`.
        * **Enhanced Icon Auto-Discovery:** If `faviconUrl` not provided, backend attempts best-effort discovery of app icon/favicon link from `originalUrl` (checks common tags, manifest, Open Graph, prioritizes higher-res). Stores discovered link in `Url.faviconUrl`. Manual `faviconUrl` path overrides this.
        * `addedByUserId` populated. Returns 201 with new Url. Handles errors.
    * *(List URLs: `GET /api/admin/urls`)* Returns array of all Urls, sorted by `title` (ASC). Includes all fields.
    * *(Get Single URL: `GET /api/admin/urls/[urlId]`)* Returns Url or 404.
    * *(Update URL: `PUT /api/admin/urls/[urlId]`)* Accepts optional fields. If `originalUrl` changed & no new `faviconUrl` given, re-attempts icon auto-discovery. Explicit `faviconUrl` path takes precedence. Validates. Returns updated Url or 404.
    * *(Delete URL: `DELETE /api/admin/urls/[urlId]`)* Deletes Url. `UrlInGroup` entries cascade delete. Returns 204/200 or 404.
    * *(Error Handling)* Consistent.

**Story 3.4: Implement Admin API Endpoints for Managing URLs within Specific Groups**
* **As an** Administrator,
* **I want** secure backend API endpoints to add an existing global URL to a group, list URLs within a group (ordered), update URL properties specific to that group membership (display order, group-specific title), and remove a URL from a group.
* **So that** I can precisely curate group content.
* **Acceptance Criteria:**
    * *(API Structure & Security)* Routes under `/api/admin/urlGroups/[groupId]/urls` and `/api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. `ADMIN` role required.
    * *(Add URL to Group: `POST .../[groupId]/urls`)* Accepts `urlId` (req), `displayOrderInGroup?`, `groupSpecificTitle?`. Validates existing Group/Url, unique combo. Creates `UrlInGroup`. Returns 201 with `UrlInGroup` or augmented URL.
    * *(List URLs in Group: `GET .../[groupId]/urls`)* Returns array of URL objects (global Url data + `UrlInGroup` overrides like `effectiveTitle`, `urlInGroupId`, `displayOrderInGroup`), sorted by `UrlInGroup.displayOrderInGroup` (ASC). 404 if group not found.
    * *(Update URL-in-Group: `PUT .../[groupId]/urls/[urlInGroupId]`)* Accepts `displayOrderInGroup?`, `groupSpecificTitle?`. Updates `UrlInGroup`. Returns updated object or 404.
    * *(Remove URL from Group: `DELETE .../[groupId]/urls/[urlInGroupId]`)* Deletes `UrlInGroup` association. Returns 204/200 or 404.
    * *(Error Handling)* Consistent.

**Story 3.5: Develop Admin UI for URL Group Management**
* **As an** Administrator,
* **I want** a UI in the admin dashboard to create, view (list sorted by `displayOrder` then `name`), update (name, description, displayOrder), and delete URL groups (with confirmation).
* **So that** I can visually manage URL groups.
* **Acceptance Criteria:**
    * *(UI Page & Access)* `/admin/url-groups` page, admin layout, `ADMIN` only.
    * *(List Groups)* Fetches from `GET /api/admin/urlGroups`. Loading/error states. MUI `Table`/`List` shows `name`, `description?`, `displayOrder`. Sorted by API default. Message if no groups.
    * *(Create Group)* MUI `Button` -> `Dialog` with form (`name` (req), `description?`, `displayOrder?`). Client validation. Confirmation dialog. `POST` API. List refreshes. Success/error `Snackbar`.
    * *(Edit Group)* "Edit" action -> `Dialog` pre-filled. Admin modifies. Client validation. Confirmation dialog. `PUT` API. List refreshes. Success/error.
    * *(Delete Group)* "Delete" action -> `Dialog` with stern warning about cascade. `DELETE` API. List refreshes. Success/error.
    * *(UX)* MUI components, loading indicators, feedback. Responsive (desktop/tablet focus).

**Story 3.6: Develop Admin UI for Managing URLs within Groups and Global URL Icon Management**
* **As an** Administrator,
* **I want** a UI where, after selecting a URL Group, I can add existing or new global URLs to it (with feedback on icon auto-fetch and duplicate URL errors), remove URLs, reorder them, and edit their group-specific title. I also need a clear way to manage the primary global icon for any URL (viewing auto-discovered icons, uploading/removing custom icons, and gracefully handling broken icon images).
* **So that** I can fully curate group content and ensure URLs are represented by the best available or custom-defined icon.
* **Acceptance Criteria:**
    * *(UI Context)* Section for managing URLs within a selected group (from Story 3.5 UI). `ADMIN` only.
    * *(Display URLs in Group)* Fetches from `GET /api/admin/urlGroups/[groupId]/urls`. Loading/error. List/Table sorted by `UrlInGroup.displayOrderInGroup`. Shows `effectiveTitle`, `originalUrl`, global `Url.faviconUrl`. Handles broken favicons by showing title prominently.
    * *(Add Global URL to Group)* "Add URL" `Button` -> `Dialog`. Option to select existing global URL (searchable list from `GET /api/admin/urls`) OR create new global URL (`originalUrl`, `title` inputs).
        * If creating new, on `originalUrl` input, client triggers icon auto-discovery (Story 3.3 logic). Discovered icon shown as preview. `Snackbar` if auto-fetch fails ("Could not automatically find icon...").
        * Admin sets `displayOrderInGroup?`, `groupSpecificTitle?`. Confirmation dialog. API calls (`POST /api/admin/urls` if new, then `POST /api/admin/urlGroups/[groupId]/urls`).
        * UI handles 409 duplicate `originalUrl` error from API with message: "Error: This URL already exists as '[Existing URL Title]'...".
        * List refreshes. Success/error `Snackbar`.
    * *(Edit URL in Group - `UrlInGroup` props)* "Edit in Group" action. `Dialog` pre-filled with `displayOrderInGroup`, `groupSpecificTitle`. Admin modifies. Confirmation. `PUT /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. List refreshes.
    * *(Reorder URLs in Group)* Drag-and-drop or Up/Down buttons to change `displayOrderInGroup`. Triggers API updates. UI reflects new order.
    * *(Manage Global URL Icon/Details)* "Edit Global URL Details & Icon" action per URL. `Dialog` for global `Url` entity: `originalUrl` (editing re-triggers icon auto-fetch), `title` (req), `notes?`, `mobileSpecificUrl?`.
        * Manages global `Url.faviconUrl`: Shows current (image/placeholder). "Upload/Change Custom Icon" `Button` + file input (JPG/PNG/ICO, max 100KB, client validation, preview). Confirmation. API (`POST /api/admin/urls/[urlId]/upload-favicon`) uploads to `/public/url_favicons/`, backend updates `Url.faviconUrl`.
        * Option "Re-check for Auto-Discovered Icon": Triggers backend icon discovery. Shows suggestion. Admin accepts to update `Url.faviconUrl`. `Snackbar` if discovery fails.
        * Option "Remove Icon": Sets `Url.faviconUrl` to null, deletes custom server file.
        * Saving global details calls `PUT /api/admin/urls/[urlId]`. Icon display updates.
    * *(Remove URL from Group)* "Remove from Group" action. Confirmation ("...does not delete global URL."). `DELETE /api/admin/urlGroups/[groupId]/urls/[urlInGroupId]`. List refreshes.
    * *(UX)* MUI, loading states, feedback. Responsive. Icon upload limits (type/size) defined & enforced.

**Story 3.7: Implement API Endpoint for Authenticated Users to Fetch Their Accessible Groups and URLs**
* **As an** Authenticated User,
* **I want** an API endpoint that provides my accessible URL Groups and URLs (with `createdAt`, `updatedAt`, `lastLoginAt` fields included as ISO date strings in JSON).
* **So that** the frontend can display this content, parsing date strings into `Date` objects.
* **Acceptance Criteria:**
    * *(API & Security)* `GET /api/dashboard/urlGroups`. Authenticated (any role). 401 if unauth.
    * *(Data Fetching)* Identifies user. Queries `UserGroupAccess` for `groupId`s. For each, gets `Group` details. For each `Group`, gets `UrlInGroup` records (ordered by `displayOrderInGroup` ASC), including related `Url` data.
    * *(API Response Structure)* 200 OK with JSON array of `Group` objects (sorted by `Group.displayOrder` ASC then `Group.name` ASC). Each `Group` has `id, name, description?, displayOrder?`, and `urls` array. Dates (e.g., `Group.createdAt`) are ISO strings. Each URL in `urls` has `urlId, urlInGroupId, effectiveTitle (UrlInGroup.groupSpecificTitle` or `Url.title`), `originalUrl, faviconUrl (global Url.faviconUrl), mobileSpecificUrl?, notes?, displayOrderInGroup`. Dates from `Url` are ISO strings.
    * *(Empty States)* Empty array (`[]`) if no accessible groups. Group's `urls` array is empty if group has no URLs.
    * *(Error Handling)* Consistent (500 for server errors).
    * *(Performance)* Optimized DB query (Prisma `include`).

**Story 3.8: Implement Global User Menu and Application Header**
* **As an** Authenticated User,
* **I want** a consistent and responsive application header (AppBar) that displays the application logo/name, a mobile menu toggle (hamburger icon) on the left for main URL/Group navigation on small screens, and a user button on the right providing access to a dropdown menu with navigation links (Dashboard, Settings, conditional Admin Area), a theme (light/dark/system) toggle, and a logout option.
* **So that** I can easily navigate, manage my session, control basic preferences, and access account-specific functions from anywhere within the authenticated application, adapting to device and the app's default "Top Menu" style for desktop URL/Group navigation (which can be changed by user preference in Epic 4).
* **Acceptance Criteria:**
    * *(AppBar Structure & Common Elements)* MUI `AppBar`, persistent on auth pages.
        * Left: App Logo/Name (from Story 2.4 branding, defaults).
        * Right: User Button (MUI `Button`/`IconButton`) - shows user avatar (or fallback) and (on larger screens) user `name` + dropdown arrow. Mobile: only avatar. Opens User Dropdown Menu.
        * Mobile Menu Toggle (Far Left, Mobile Only): Hamburger icon (MUI `IconButton`) on AppBar left *only on mobile*. Toggles MUI `Drawer` from left (drawer content by Story 3.9). Story 3.8 ensures toggle exists and controls drawer state.
    * *(Desktop "Top Menu Layout" Header Structure - for Story 3.9/4.2)* For desktop views when "Top Menu" style is active: AppBar has 3 sections: `[Logo/Name (Left)] [Central Area for Top Navigation Content (Story 3.9 basic / Story 4.2 rich)] [User Button (Right)]`. Mobile: central area hidden.
    * *(User Dropdown Menu)* Clicking User Button opens/closes MUI `Menu`. State managed.
        * Navigation: "Dashboard" (`/dashboard`), "Settings" (`/settings/profile`), "Admin Area" (conditional on `ADMIN` role, to `/admin`). MUI `MenuItem`s + icons.
        * Theme Control: "Toggle Theme" / "Light/Dark/System Mode" `MenuItem` + icons. Toggles persisted theme (from Story 4.1) via API and updates UI dynamically.
        * Session Management: "Logout" `MenuItem` + icon. Triggers `signOut({ callbackUrl: '/login' })`.
    * *(Responsiveness & Interaction)* AppBar & elements fully responsive. User Button adapts. Mobile Menu Toggle appears/disappears. Dropdown keyboard navigable, `Escape` closes. Focus managed.
    * *(State & Context)* Uses `useSession()` (user details, role, logout). Theme toggle uses Theme Context & persisted setting (Story 4.1). Nav uses Next.js router.

**Story 3.9: Implement User Dashboard UI with Multi-Iframe Handling, State Preservation, and Device-Specific Navigation**
* **As an** Authenticated User,
* **I want** my main dashboard to display my assigned URL groups and URLs with clear visual states (opacity for active/loaded/unloaded, active indicator) via a default **top-menu layout on desktop** and a **collapsible side-drawer menu (with accordion-style group expansion) on mobile**. When I select a URL, its corresponding iframe should become visible, preserving its state if previously loaded (using `visibility:hidden` for inactive iframes). The first URL should load automatically, and my selected group should be remembered during my current session.
* **So that** I can access and seamlessly switch between my organized web content with preserved states, and receive clear visual cues, in a functional and device-appropriate manner for the MVP.
* **Acceptance Criteria:**
    * *(Dashboard Page & Data)* `/dashboard/page.tsx` in global layout (Story 3.8). Fetches data from `GET /api/dashboard/urlGroups` (Story 3.7). Loading/error states. If no groups: neutral UI (e.g., "Dashboard is empty."), `console.log` for dev.
    * *(Desktop Group/URL Display - "Top Menu" Style)* `AppBar` (Story 3.8) shows selected `Group.name`. Clicking opens MUI `Menu`/`Select` for group choice (sorted). Selecting group updates AppBar & populates secondary horizontal URL display area (scrollable row below `AppBar`) with its URLs (sorted). URL items show `faviconUrl` (or fallback) & `effectiveTitle`. First group default selected.
    * *(Mobile Group/URL Display - Collapsible Left Drawer)* On mobile: desktop horizontal URL area hidden. Hamburger in `AppBar` (Story 3.8) toggles MUI `Drawer` from left. Inside Drawer: list of groups (sorted); each group is MUI `Accordion` header. Clicking group expands in-place to show its URLs as sub-list. URL items show favicon/title. Selecting URL closes drawer. First group/URL may be pre-selected/expanded.
    * *(URL Item Visual States - for both Desktop & Mobile lists)*
        * Active/selected URL: opacity `1.0` + blue underline (desktop top menu) / blue right border (mobile drawer/desktop side menu).
        * Inactive but loaded URL (iframe exists and has loaded content): opacity `1.0`.
        * Inactive and unloaded URL (iframe not yet loaded or explicitly unloaded): opacity `0.5`.
    * *(Multi-Iframe Management & Display)* One iframe per unique `originalUrl` selected, added to DOM if new (managed by Story 4.2's state logic, this story implements basic version). Active URL's iframe: `visibility: visible`. Others: `visibility: hidden; position:absolute; left:-9999px;`. State preserved in hidden iframes.
    * *(Initial Iframe Load & Basic State Indicators)* First URL of default group auto-loads into iframe. When iframe `src` set first time: loading indicator (MUI `CircularProgress` or text). On success, indicator removed, URL item gets "loaded" state. On failure, error message in iframe area, URL item remains "unloaded".
    * *(Selected Group State Persistence - Current Session)* Selected group maintained during current active session (e.g., React Context/state). Resets on full reload/new login for Epic 3 (full persistence is Epic 4).
    * *(Broken Favicon Handling)* If `Url.faviconUrl` image fails to load, broken icon hidden, `effectiveTitle` is primary identifier.
    * *(UX & Layout)* Intuitive flow for desktop/mobile. Clear layout separation.

---
### Epic 4: Advanced Iframe Interaction & User Personalization
**Goal:** Implement a highly interactive and customizable user dashboard experience, including user-selectable menu positions (Side or Top for desktop URL/Group navigation), advanced iframe state management (persisting multiple loaded iframes with CSS `visibility` for state retention, and an explicit unload mechanism via long-press), clear visual indicators in the menus for URL states (active/inactive, loaded/unloaded using opacity/underline), and specific performance optimizations, all based on the user's comprehensive provided specification. (Search feature was removed).

**Story 4.1: Implement Persistent User Settings for Layout (Menu Position & Theme)**
* **As an** Authenticated User,
* **I want** to be able to choose my preferred main navigation menu position for desktop viewing (Top Menu or Side Menu) and my preferred application theme (Light, Dark, or System default) via my User Settings page. These preferences should be saved to my account and applied consistently across the application, with the header and dashboard layouts dynamically adapting to my chosen menu position and theme.
* **So that** I can personalize my ControlCenter interface for optimal usability, comfort, and visual preference, and have these settings persist across my sessions and devices.
* **Acceptance Criteria:**
    * *(Schema Definition - `UserSetting` Model)* New Prisma model `UserSetting` (1-to-1 with `User`). Fields: `theme ThemeData @default(SYSTEM)` (Enum: `LIGHT DARK SYSTEM`), `menuPosition MenuPositionData @default(TOP)` (Enum: `TOP SIDE`), `updatedAt`. `User` model gets `settings UserSetting?`. Migration. Client regen. Logic added to user creation (Story 1.2/2.3) to auto-create `UserSetting` with defaults.
    * *(Backend API for User Settings)* `GET /api/user/settings` (fetches settings, should always find due to AC1.3) and `PUT /api/user/settings` (updates `theme` and/or `menuPosition`). Protected, user-specific. Validation.
    * *(Session Data Enhancement)* NextAuth.js session/JWT includes persisted `theme` and `menuPosition`.
    * *(User Settings Page UI - on `/settings/profile`)* "Layout & Appearance Preferences" section. MUI controls for "Preferred Menu Position (Desktop)" (Top/Side) & "Preferred Theme" (Light/Dark/System). Reflects current saved pref. "Save Preferences" button calls `PUT` API. Success/error msgs. Dynamic UI update on save.
    * *(Dynamic Header Adaptation - affects Story 3.8)* Global Header (Story 3.8) reads `menuPosition` from session. Desktop: Adapts structure (3-section for Top Menu pref vs. hidden for Side Menu pref). Mobile header consistent.
    * *(Dynamic Dashboard Layout - affects Story 3.9)* Dashboard (Story 3.9) reads `menuPosition`. Desktop: "Top Menu" pref -> URL/Group nav in AppBar's center (content by Story 4.2). "Side Menu" pref -> persistent side panel for URL/Group nav (content by Story 4.3); top AppBar URL nav area hidden. Mobile: always drawer.
    * *(Theme Application & Header Toggle Update - affects Story 3.8)* MUI ThemeProvider uses persisted `UserSetting.theme`. Header theme toggle (Story 3.8) reads/writes persisted setting via API. "SYSTEM" theme respects OS `prefers-color-scheme` (reload pick-up sufficient for MVP).
    * *(Default Values & Persistence)* Settings saved to backend. Defaults (`theme: SYSTEM`, `menuPosition: TOP`) applied on `UserSetting` creation.

**Story 4.2: Implement Core Iframe State Management (Tracking Multiple Mounted Iframes, Loaded/Unloaded States, Active URL with `src`/`data-src` control)**
* **As the** Frontend System / Dashboard UI,
* **I want** a robust client-side state management system (e.g., React Context via an `IframeProvider` and a custom hook like `useIframeManager`) that tracks multiple iframes (kept mounted with visibility controlled by CSS `visibility: hidden`), manages their "loaded" (content in `src`) vs. "unloaded" (`src=""`) states using a `src`/`data-src` attribute pattern, and identifies the "active" URL for display.
* **So that** the application can support efficient, stateful switching between iframes, with precise control over content loading and resource usage, providing accurate data for visual state indicators (opacity for loaded/unloaded states) in the navigation menus.
* **Acceptance Criteria:**
    * *(`IframeProvider` Context)* React Context (`IframeStateContext`) & Provider (`<IframeProvider>`) wraps dashboard. Stores: tracked URLs map, each URL's "loaded" status (boolean), `activeUrlIdentifier`.
    * *(`useIframeManager` Hook)* Exposes: `activeUrlIdentifier`, `isUrlLoaded(id)`, `setActiveUrl(id, srcForDataSrc)` (signals iframe `src` set from `data-src` if unloaded/new), `markUrlAsLoaded(id)` (on iframe `onload`), `markUrlAsUnloaded(id)` (signals iframe `src` to `""`), `getManagedIframes()` (returns array `{identifier, dataSrc, currentSrc, isLoaded, isActive}`).
    * *(Dashboard Iframe Rendering)* Uses `useIframeManager`. Iterates `getManagedIframes()` to render `<iframe>`s. Each has `key`, `src` (bound to `currentSrc`, initially `""`), `data-src` (actual `originalUrl`). `setActiveUrl` needing load triggers dashboard to update target iframe `src` from `data-src`.
    * *(CSS Visibility Control)* Active iframe: `visibility: visible`. Others: `visibility: hidden; position: absolute; left: -9999px;`.
    * *(Updating "Loaded" Status)* Iframe wrapper monitors `onload` (calls `markUrlAsLoaded`) and `onerror` (status remains `loaded: false`).
    * *(State Preservation Verification)* Scenario: Load A -> scroll -> Load B -> Show A again; A's state (scroll, form inputs) preserved, no `src` reload.
    * *(Initial URL Load)* Integrates with Story 3.9's initial auto-load (uses `setActiveUrl`, `markUrlAsLoaded`).
    * *(Foundation for Opacity)* `isUrlLoaded()` provides state for menu item opacity.

**Story 4.3: Implement Detailed Desktop/Tablet "Top Menu" URL/Group Navigation Experience (with Opacity/Underline Indicators)**
* **As an** Authenticated User (with "Top Menu" as my preferred desktop layout),
* **I want** the URL/Group navigation within the main application header's central area to function as a "hover-to-expand" menu. In its normal (non-hovered) state, it should show my currently selected group's name alongside a horizontal row of its URL items (icons/titles) with visual indicators for "loaded" (opacity 1.0), "unloaded" (opacity 0.5), and "active" (blue underline) states. Hovering over this area should expand a temporary view showing other accessible groups and their respective URLs, allowing me to quickly switch my active URL and group.
* **So that** I have a rich, intuitive, and space-efficient "Top Menu" experience for navigating my URLs, consistent with the detailed design specification (hover-expand model and opacity/underline visual states).
* **Acceptance Criteria:**
    * *(Conditional Rendering)* Renders in `AppBar` central area if `menuPosition === TOP` & desktop/tablet (≥768px). Replaces simpler Epic 3 top menu nav.
    * *(Normal State Display)* Consumes groups/URLs (Story 3.7 data) & iframe states (Story 4.2 hook). Displays current selected group `name`. Displays horizontal row of URL items for *that group only*. URL items show `faviconUrl` (or fallback, title prominent if broken) & `effectiveTitle`. Visual states: opacity 0.5 (unloaded), 1.0 (loaded), blue underline (active). Default group/URL reflected.
    * *(Hover-to-Expand Interaction)* Hovering selected group name/area triggers expanded view (MUI `Popper`/`div`) below AppBar central nav area (no page reflow). Expanded view lists: current group + its URLs; other groups + their URLs (all with correct visual states). Mouse-out collapses view smoothly.
    * *(Interaction from Expanded View)* Clicking any URL: calls `setActiveUrl()`, updates "selected group" state, collapses expansion. Normal display updates.
    * *(Responsive Adaptation - Tablet)* Horizontal URL rows adapt (condensed spacing). If URL row overflows: becomes horizontally scrollable (touch-swipe). "More" ("•••") icon at end opens MUI `Menu` with overflowed URLs for that group's row; selection works as above. Dropdown touch-optimized.
    * *(Layout & Scrolling)* Fits in AppBar/popper. No main page scroll. App 100% viewport height.
    * *(Integration & Performance)* Activates on `menuPosition === TOP`. Consumes `useIframeManager`, group/URL data. Updates active URL/selected group. Fits in AppBar (Story 3.8). Smooth interactions (300ms anim). Efficient rendering (memoization).

**Story 4.4: Implement Desktop/Tablet "Side Menu" Navigation Experience (with Opacity/Border Indicators)**
* **As an** Authenticated User (with "Side Menu" as my preferred desktop/tablet layout),
* **I want** the main application navigation to be presented as a persistent, full-height "Side Navigation Panel" on the left. This panel should include the Application Logo/Name at its top, vertically stacked expandable URL groups and their URLs (with opacity indicators for "loaded/unloaded" states and a blue right border for the "active" URL) in the main area, and the User Menu functionality at its bottom. This panel should be collapsible on desktop and tablet to an icons-only view, and it replaces the top AppBar on these larger views.
* **So that** I have a rich, well-organized, and navigable "Side Menu" experience for accessing my URLs, consistent with the detailed design specification.
* **Acceptance Criteria:**
    * *(Conditional Rendering)* Renders if `menuPosition === SIDE` & desktop/tablet (≥768px). Main `AppBar` (Story 3.8) is *not rendered*. Top Menu nav (Story 4.3) hidden.
    * *(Side Panel Structure - Expanded Desktop ≥768px)* Full-height, persistent left panel (MUI `Drawer` `variant="persistent"` or custom `div`, pushes content). Width ~20% or fixed (250-300px). Fixed position. Internal content scrollable. Main content area (iframe) resizes. No main page scroll.
        * Panel Content (Expanded):
            * Top: App Logo/Name (Story 2.4). Collapse/Expand toggle button (MUI `IconButton` chevron) in panel's top section.
            * Middle (Navigation): Vertical list of URL Groups (accordion style), sorted. Expanding group shows its URLs. URL items: `faviconUrl` (or fallback, title if broken) AND `effectiveTitle`. Visual states: opacity 0.5 (unloaded), 1.0 (loaded), blue **right side border** (active). Selected group expanded by default.
            * Bottom: Reusable User Menu component (Story 3.8) rendered as accordion section ("User Options") or list.
    * *(Side Panel Collapsible Behavior - Desktop/Tablet ≥768px)* Clicking toggle animates panel width.
        * Collapsed State (Icons-Only): Panel shrinks (~72px). Group headers show abbreviated initials in circle/avatar or generic group icon. URLs in (conceptually) expanded group show only `Url.faviconUrl`. User Menu collapses to icon trigger (opens small popper/menu). MUI `Tooltip` on hover for all icons.
        * Main content area resizes smoothly. User's collapsed/expanded state preference persists for session (e.g., `localStorage`).
    * *(URL/Group Interaction)* Click group header expands/collapses. Click URL sets active URL. Indicators update.
    * *(Integration)* Renders on `menuPosition === SIDE`. No `AppBar` (desktop/tablet). Consumes `useIframeManager`, group/URL data. Updates active URL/selected group.
    * *(Performance & Transitions)* Smooth animations (300ms) for panel/accordion. Efficient rendering.

**Story 4.5: Implement Click (Activate/Ensure Loaded/Reload) and Long-Press (Unload) for URLs with Specific Unload UI**
* **As an** Authenticated User,
* **I want** specific behaviors when I single-click or long-press (2 seconds, visual progress bar) on a URL item in any menu: single click activates/loads/reloads; long press unloads iframe content, makes iframe hidden, displays "Content Unloaded" + reload option.
* **So that** I have intuitive control over URL loading, viewing, and resource management.
* **Acceptance Criteria:**
    * *(Single-Click Behavior - All Menus)*
        * If URL not active OR unloaded: `setActiveUrl()` (loads via `src` from `data-src`). Menu item "active" (opacity 1.0 + indicator). "Content Unloaded" message (if visible) cleared.
        * If URL active AND loaded: Reloads active iframe content (e.g., `src` from `data-src` again). Loading indicators. Menu item "active."
    * *(Long-Press Detection & Visual Feedback - `useLongPress`)* Hook/logic detects 2s sustained press (mouse/touch). Visual progress bar (animating left-to-right along bottom edge of URL item) during hold. Optional tooltip. Event listeners managed.
    * *(Long-Press Action - Unload)* On 2s press: `markUrlAsUnloaded()` (Story 4.2 - sets iframe `src=""`, state "loaded: false"). Menu item "unloaded" (opacity 0.5, loses active indicator). Haptic feedback on mobile.
    * *(Behavior if Active URL Unloaded)* Unloaded URL's iframe `visibility: hidden`. Main content area displays: centered "Content Unloaded" text (contrasting color) + "Reload Content" MUI `Button`. Clicking "Reload" calls `setActiveUrl()` for that URL, re-initiating load; message/button removed; iframe loaders appear; menu item "active". `activeUrlIdentifier` might persist (but item not styled active in menu until reloaded) or become null. Selecting another URL loads it normally, clears "Content Unloaded" message.
    * *(Cancellation of Long Press)* Release before 2s: long-press cancelled, progress indicator resets. No single-click triggered.
    * *(Integration)* Actions update `useIframeManager` states. Menu indicators update instantly.

**Story 4.6: Ensure Advanced Features & Opacity/Underline/Border Indicators Work in Mobile Drawer Navigation**
* **As an** Authenticated User (on mobile),
* **I want** the mobile navigation drawer to display refined URL state indicators (opacity for loaded/unloaded, active indicator consistent with desktop side menu - blue right border). I also want long-press to unload URLs (haptic feedback, progress indicator) to be functional and optimized for touch.
* **So that** I have a consistent, rich, usable experience on mobile, equivalent to desktop advanced features.
* **Acceptance Criteria:**
    * *(Mobile Drawer URL Item Visual States)* URL items in mobile drawer (Story 3.9 accordion) display universal visual states from `useIframeManager` (Story 4.2): opacity 0.5 (unloaded), 1.0 (loaded). Active URL has blue **right side border**.
    * *(Click Interaction in Mobile Drawer)* Single-click triggers "Activate/Ensure Loaded/Reload" (Story 4.5). Iframe updates, drawer closes, indicators update.
    * *(Long-Press Interaction in Mobile Drawer)* Long-press (2s) triggers "Unload URL Content" (Story 4.5). Visual progress bar on item. Haptic feedback. Item "unloaded" (opacity 0.5). Iframe area shows "Content Unloaded" UI.
    * *(Mobile Usability & Touch Optimization)* Touch targets adequate. Animations smooth.
    * *(Consistency)* State changes via `useIframeManager` consistent with desktop. "Loaded"/"unloaded" status universal.

---
### Epic 5: Admin Dashboard - System Operations & Monitoring
**Goal:** Equip administrators with critical system operation tools, including database backup and restore functionality (accessible from the admin dashboard post-initial setup, and also powering the "first run" restore capability), provide basic system statistics, implement user activity tracking with structured details, and configurable log retention with automated pruning.

**Story 5.1: Implement Backend Logic and API for Application Backup (Async, with Backup Manifest)**
* **As an** Administrator,
* **I want** a secure backend API endpoint that initiates a full application backup (database, assets, manifest) as an asynchronous background process, providing an immediate acknowledgment that the backup has started.
* **So that** I can trigger backups without waiting and the system can perform potentially long backups efficiently.
* **Acceptance Criteria:**
    * *(API Endpoint)* `POST /api/admin/system/backup`. `ADMIN` role.
    * *(Data to Backup)* SQLite DB file, `/public/avatars/`, `/public/url_favicons/`, `/public/branding/`. `.env` excluded.
    * *(Backup Archive Creation - Background)* Collects data, creates metadata (AC 4), packages into timestamped `.zip` (e.g., `controlcenter_backup_YYYYMMDD_HHMMSS.zip`) with relative paths.
    * *(Backup Manifest File)* `backup_manifest.json` in zip root: `backupCreatedAtTimestamp` (ISO), `databaseSchemaVersionId` (last Prisma migration ID), `applicationVersion?` (from `package.json`/git hash).
    * *(Backup Storage - Background)* Saves archive to designated secure server dir (e.g., `/data/backups/`, configurable). New archive per operation (no auto-rotation for MVP).
    * *(API Response - Async)* On successful *initiation*: HTTP 202 Accepted. JSON response: "Backup process initiated successfully...". Optional task ID. If initiation fails: 4xx/5xx error. Errors *during background process* logged server-side.
    * *(DB Integrity)* Attempts to ensure SQLite integrity during backup (online backup API or direct copy with documented considerations).
    * *(Resource & Async Execution)* Backup is asynchronous. API returns quickly.

**Story 5.1.5: Implement API Endpoints for Managing Backup Files (List, Download, Delete)**
* **As an** Administrator,
* **I want** secure backend API endpoints to list available backup archives, download a specific file, and delete a file.
* **So that** I can manage backup lifecycles via the admin UI.
* **Acceptance Criteria:**
    * *(API Security)* Endpoints under `/api/admin/system/backups/` require `ADMIN` role.
    * *(List Backups: `GET /api/admin/system/backups`)* Reads backup dir. Returns JSON array: `{ filename, createdAtTimestamp (from name/meta), sizeBytes, databaseSchemaVersionId?, applicationVersion? (optional, if manifest parsed for list) }`. Sorted newest first. Empty array if none. Handles errors.
    * *(Download Backup: `GET /api/admin/system/backups/[filename]`)* Validates filename. Streams `.zip` file with download headers. 404 if not found/invalid. Handles read errors.
    * *(Delete Backup: `DELETE /api/admin/system/backups/[filename]`)* Validates filename. Deletes file from server. 204/200 or 404. Handles errors.
    * *(Security)* Filename params sanitized (no path traversal). Backup dir not public.

**Story 5.2: Implement Backend Logic and API for Application Restore from Backup (Async, Refined Restore Order, Manifest Reading & Migration Handling)**
* **As an** Administrator,
* **I want** a secure backend API endpoint to upload a backup archive and initiate an asynchronous background process to restore state (DB & assets). Process must restore DB, run migrations, then restore assets. Provide immediate API acknowledgment.
* **So that** I can reliably recover or perform initial setup via "First Run Restore", without UI timeout, ensuring DB integrity first.
* **Acceptance Criteria:**
    * *(API Endpoint)* `POST /api/admin/system/restore`. Accepts `.zip` file upload. `ADMIN` role (with considerations for First Run context).
    * *(Archive Validation - Background)* Validates `.zip`. Unzips securely. Verifies `controlcenter.db`, `backup_manifest.json`, asset folders. Aborts with server log if critical files missing.
    * *(Manifest Reading - Background)* `backup_manifest.json` read. Details logged.
    * *(DB Restore & Migration First - Background)*
        * Temporary backup of current live SQLite DB made.
        * Live DB replaced with backup's DB.
        * Prisma migrations (`npx prisma migrate deploy` equivalent) programmatically triggered on restored DB.
        * Error Handling: If DB replace or migration fails, aborts, attempts restore of temp pre-restore DB. Logs error. Asset restore (AC 5) not attempted.
    * *(Asset File Restore - Background, Conditional)* Only if DB ops successful: (Optional) temp backup of live assets. Live asset dirs cleared/replaced with archive content. File permissions ensured. Error Handling: If asset restore fails, error logged. System may be mixed state.
    * *(API Response - Async)* On successful *initiation*: HTTP 202 Accepted. JSON: "Restore process initiated from '[filename]'...". If initiation fails: 4xx/500 error. Detailed success/failure of *background process* logged server-side.
    * *(Post-Restore System State)* After successful background restore: App restart recommended/attempted. Sessions invalidated. If "first run", no longer in that state.

**Story 5.3: Develop Admin UI for Backup, Restore, and Backup File Management**
* **As an** Administrator,
* **I want** an intuitive UI in the admin dashboard to: initiate async backups; view, download, and delete existing backup files; and initiate an async restore from an uploaded archive, with clear warnings, pre-backup suggestions, and feedback.
* **So that** I can easily manage data safety, backup lifecycle, and recovery via the UI.
* **Acceptance Criteria:**
    * *(Admin Page)* "/admin/system/operations" (or similar) page. `ADMIN` only. Sections: "Manage Existing Backups," "Create New Backup," "Restore Application."
    * *(Manage Existing Backups UI)* On load, calls `GET /api/admin/system/backups`. Loading/error states. Displays backups in MUI `Table`/`List` (filename, createdAt, size). Sorted newest first. "No backups found" message. Actions per backup:
        * "Download" `Button`: `GET /api/admin/system/backups/[filename]`.
        * "Delete" `Button`: Confirmation dialog ("Are you sure...delete '[filename]'?"). `DELETE` API. List refreshes. Success/error `Snackbar`.
        * "Refresh List" `Button`.
    * *(Create New Backup UI - Async)* "Create New Backup" `Button`. Confirmation: "Are you sure...run in background?". On confirm, `POST /api/admin/system/backup`. Loading indicator during API initiation. On 202 Accepted: `Snackbar` "Backup initiated...Refresh list soon." On API init failure: error `Snackbar`.
    * *(Restore from Backup UI - Async)* Section displays strong warnings (data overwrite, restart, logout).
        * Prominent suggestion/button: "Recommended: Create a fresh backup now?" -> triggers Create Backup flow.
        * File input (`<input type="file" accept=".zip">`) + MUI `Button` for selecting local `.zip`.
        * "Upload and Restore" `Button` (disabled until file selected). Clicking -> Stern confirmation dialog ("WARNING...PERMANENTLY OVERWRITE...Are you sure?").
        * On confirm: Uploads to `POST /api/admin/system/restore`. Loading/progress messages ("Uploading...", "Initiating restore...").
        * On 202 Accepted from API: `Snackbar`/message "Restore process initiated...Application might restart...log in again." UI might become read-only or suggest refresh/re-login.
        * On API init failure: detailed error `Snackbar`.
    * *(UX)* MUI components, clear feedback, loading states. Responsive (desktop/tablet admin focus).

**Story 5.4: Implement Basic System Statistics Display in Admin Dashboard**
* **As an** Administrator,
* **I want** a simple overview of key system statistics on an admin page/section (Total Users, Groups, Global URLs).
* **So that** I can quickly get a sense of application usage and content scale.
* **Acceptance Criteria:**
    * *(Admin UI)* "System Statistics" / "Dashboard Overview" section/page in admin (e.g., on `/admin` or `/admin/stats`). `ADMIN` only.
    * *(Stats Displayed)* Labels + numerical values for: "Total Registered Users", "Total URL Groups", "Total Global URLs". Clean format (MUI `Card`s or list).
    * *(Backend API for Stats)* `GET /api/admin/statistics/summary` (or similar) returns JSON `{ userCount, groupCount, urlCount }`. `ADMIN` role. Backend uses Prisma `count()`.
    * *(Data Fetching & Display)* UI calls API on load. Loading indicator (MUI `Skeleton`). Error message on fail. Stats are read-only. Optional "Refresh Stats" `Button`.
    * *(UX)* Clear, concise. Responsive (desktop/tablet admin).

**Story 5.5: Implement Basic User Activity Tracking Log (Backend & Admin UI with Structured JSON Details)**
* **As an** Administrator and as the System,
* **I want** key user/admin actions logged with structured details (who, what, when, specifics), and an Admin UI to view this paginated log, with potential basic client-side search.
* **So that** there's a rich audit trail for understanding usage, troubleshooting, and monitoring.
* **Acceptance Criteria:**
    * *(`ActivityLog` Prisma Model)* Fields: `id`, `timestamp`, `userId?`, `actingUserName` (String), `userRole?`, `actionType` (String/Enum), `details (Json?)`, `targetEntityType?`, `targetEntityId?`, `isSuccess?`. `User` relation `onDelete: SetNull`. Migration. Client regen.
    * *(Backend Logging Service)* Reusable service `createActivityLogEntry(data: CreateActivityLogDto)` (with `details: Record<string, any>`). Creates `ActivityLog` via Prisma.
    * *(Key Actions Logged - MVP Scope, with structured `details`)*:
        * User Login (e.g., `details: { ipAddress?: "..." }`).
        * Admin User Management (Story 2.3): Create (e.g., `details: { createdUserName: "...", role: "..." }`), Update (e.g., `details: { field: "role", oldValue: "USER", newValue: "ADMIN", targetUserName: "..." }`), Disable/Enable status.
        * Admin Branding (Story 2.4): (e.g., `details: { setting: "appName", newValue: "..." }`).
        * Admin Group/URL Mgt (Stories 3.2-3.4): CRUD on Groups, URLs, UrlInGroup (e.g., `details: { groupName: "...", groupId: "..." }`).
        * System Ops (Stories 5.1, 5.2): Backup/Restore initiation & completion (e.g., `details: { status: "success/failure", filename: "..." }`).
        * User Settings Changes (Story 4.1): Theme/Menu pref change (e.g., `details: { setting: "theme", newValue: "DARK" }`).
        * NO sensitive data logged.
    * *(Admin UI for Activity Log)* "/admin/activity-log" page. `ADMIN` only. MUI `Table`. Columns: Timestamp, Acting User, Action Type, Details (parsed JSON, readable format), Target, Success. Reverse chronological. Server-side pagination (25-50/page). Optional: Leverage MUI table client-side search if easy for displayed data.
    * *(Backend API for Logs)* `GET /api/admin/activity-log`. `ADMIN` role. Supports pagination. Returns paginated `ActivityLog` records (`details` as JSON).
    * *(Performance & Security)* Logging efficient. No sensitive data.

**Story 5.6: Implement Configurable Log Retention Policy for Activity Logs (Default 180 days, Manual Trigger & Pruning Log)**
* **As an** Administrator and as the System,
* **I want** to configure a retention policy for activity logs (default 180 days, 0=forever) via admin UI, have the system auto-prune old logs, log pruning actions, and allow manual pruning trigger.
* **So that** I manage log storage, adhere to retention preferences, and have control over cleanup.
* **Acceptance Criteria:**
    * *(`SystemSetting` Schema Enhancement)* `SystemSetting` model (Story 4.1) updated with `logRetentionDays (Integer, @default(180))`. `0` means keep indefinitely. Migration. Client regen. Default `SystemSetting` record created with `logRetentionDays: 180` if none exists.
    * *(Admin UI for Log Retention)* Section in admin (e.g., Activity Log page or System Settings). Displays current policy. MUI `TextField` (number, min 0) or `Select` for `logRetentionDays` (e.g., "30d", "90d", "180d (Default)", "365d", "Keep Indefinitely (0)"). "Save Policy" `Button`. Confirmation dialog. API saves new `logRetentionDays`. Success/error `Snackbar`.
    * *(Backend API for Policy)* API (e.g., `PUT /api/admin/settings`) updates `logRetentionDays`. Validates non-negative int. `ADMIN` role.
    * *(Automated Log Pruning - Scheduled Task)* `node-cron` task runs periodically (e.g., daily 3 AM). Reads `logRetentionDays`. If > 0, calculates cutoff, `deleteMany` `ActivityLog` records older than cutoff. Efficient. Task logs its own execution to standard app logs. After successful pruning, task creates summary entry in `ActivityLog` table (e.g., `actionType: "SYSTEM_LOG_PRUNED"`, `actingUserName: "SYSTEM"`, `details: { entriesPruned: X, policyDays: Y }`).
    * *(Manual Log Pruning Trigger)* UI `Button` "Prune Logs Now" in Log Retention section. Confirmation dialog ("...prune according to current policy [details]?"). On confirm, calls new API `POST /api/admin/system/logs/prune-now` (`ADMIN` role). API executes pruning logic on demand (synchronously with UI loader, or async if very heavy). API response indicates success/failure/count. Manual pruning also logs to `ActivityLog`.
    * *(Default Policy Application)* Default `logRetentionDays: 180` ensures pruning if admin never configures.

---
### Epic 4: Advanced Iframe Interaction & User Personalization
*(Continued from previous Epic section in PRD, now placing Epics in numerical order)*
**Goal:** Implement a highly interactive and customizable user dashboard experience, including user-selectable menu positions (Side or Top for desktop URL/Group navigation), advanced iframe state management (persisting multiple loaded iframes with CSS `visibility` for state retention, and an explicit unload mechanism via long-press), clear visual indicators in the menus for URL states (active/inactive, loaded/unloaded using opacity/underline), and specific performance optimizations. (Search feature was removed).

*(Story 4.1 through 4.6 details as previously approved in responses: "Mon, May 26, 2025 at 4:21 PM PDT" for 4.1, "Mon, May 26, 2025 at 2:52 PM PDT" for 4.2, "Mon, May 26, 2025 at 3:29 PM PDT" for 4.3, "Mon, May 26, 2025 at 3:33 PM PDT" for 4.4, "Mon, May 26, 2025 at 3:40 PM PDT" for 4.5, and "Mon, May 26, 2025 at 3:45 PM PDT" for 4.6 - these are to be inserted here verbatim).*

---

## 8. Out of Scope / Future Enhancements (Post-MVP)

* **Comprehensive Accessibility (WCAG AA+):** While basic accessibility is considered, full WCAG AA+ compliance, including dedicated accessibility testing and remediation, is a post-MVP effort.
* **URL Search Functionality:** The previously discussed URL search feature within navigation menus has been deferred.
* **Specific Quantitative Test Coverage Targets:** Defining and enforcing strict percentage-based code coverage targets will be considered post-MVP.
* **User Self-Management of URL Groups and Global URLs:** For MVP, only administrators can create and manage URL groups and global URLs. The ability for regular users to create and manage their own private sets is a future enhancement.
* **Sophisticated Async Backup/Restore UI Feedback:** Beyond initial "initiated" messages for asynchronous backup/restore operations, real-time progress bars, status polling, or WebSocket notifications in the UI are post-MVP.
* **Application Version in Backup Manifest:** Including the `applicationVersion` in the `backup_manifest.json` is desirable but may be omitted if reliably sourcing this information in the backend proves complex for MVP. The `databaseSchemaVersionId` is the critical piece.
* **Advanced Admin List Filtering/Sorting:** Rich server-side filtering, complex multi-column sorting, and advanced search capabilities for admin tables (Users, Groups, URLs, Activity Log) beyond basic pagination and potential client-side text search are post-MVP.
* **Automatic Downloading/Re-hosting of Discovered URL Icons:** The current "icon auto-fetch" (Story 3.3) stores the *link* to a discovered icon. A more advanced version that downloads, validates, resizes, and re-hosts these icons locally would be a future enhancement.
* **Full "Between Sessions" Persistence of All UI States:** While user preferences (theme, menu position) and the "Remember Me" session are persisted across logins, finer-grained UI states like the *specifically selected group/URL* or expanded accordion states within menus resetting on new login is acceptable for MVP. More robust persistence of these minor UI states across distinct login sessions is an enhancement. (Story 3.9 already includes remembering selected group *during current active session*).
* **Live Application Theme Change on OS Theme Change:** If "System" theme is selected, the application currently picks up OS theme changes on reload. Live, dynamic adaptation without reload is a post-MVP polish.
* **Advanced Iframe Resource Management:** Beyond manual unload (`src=""`) and keeping iframes mounted with `visibility:hidden`, more advanced strategies like an LRU cache for completely removing very old/unused iframe *elements* from the DOM are post-MVP.
* **Admin Ability to Reset User Passwords / Manage User Avatars:** Current admin user management (Story 2.3) focuses on name, role, and active status. Direct password resets or avatar management for other users by an admin is deferred.
* **Public Self-Registration for Users:** The current model is admin-created users. The "User Registration Control" setting (Story 2.5) is a global flag for admin creation or a potential future self-registration feature. Implementing public self-registration pages and workflows is post-MVP.
* **Detailed Audit Log Pruning Feedback in Admin UI:** Story 5.6 logs pruning to ActivityLog. More direct UI feedback on the settings page about "Last prune run: [date], X entries deleted" is a polish item.

---

## 9. PM Checklist Assessment Summary

| Category                               | Status            | Critical Issues Noted / Key Findings & Recommendations                                                                                                |
| :------------------------------------- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Problem Definition & Context        | PASS              | None. Well-defined for a personal project.                                                                                                          |
| 2. MVP Scope Definition                | PARTIAL           | Add an explicit "Out of Scope / Future Enhancements" section to the final PRD document (addressed above).                                           |
| 3. User Experience Requirements        | PARTIAL           | No separate formal User Journey diagrams; flows embedded in stories (acceptable for this project).                                                    |
| 4. Functional Requirements             | PARTIAL           | Explicit CLI-based local testability for backend services not formally part of ACs; dev relies on API/unit tests.                                     |
| 5. Non-Functional Requirements         | PASS              | Well-contextualized for a personal project.                                                                                                         |
| 6. Epic & Story Structure              | PASS              | Clear Epics and detailed stories with ACs.                                                                                                          |
| 7. Technical Guidance                  | PASS              | "Very Technical" workflow has integrated much of this into requirements directly.                                                                     |
| 8. Cross-Functional Requirements       | PASS              | Data schemas, operational needs (backup/restore, logging) well-defined.                                                                             |
| 9. Clarity & Communication             | PASS              | Iterative process ensured clarity. Final document should be enhanced with system diagrams if possible (post this generation).                           |

**Key Findings & Recommendations from PM Checklist:**
* **Formalize "Out of Scope":** Addressed in Section 8 above.
* **User Journeys:** Reliance on stories for flow is acceptable.
* **Backend CLI Testability:** Not a primary focus; API/unit tests are key.
* **Admin UI List Mgt.:** Basic sorting/pagination for MVP is acceptable; advanced is future.
* **Icon Auto-Fetch:** "Best-effort" is noted; manual upload is fallback.
* **Async B/R UI Feedback:** MVP relies on initiation toasts and manual refresh/app state changes.
* **App Version in Backup:** Optional status confirmed.

**Overall PRD Readiness:** READY FOR DEVELOPMENT (with minor documentation additions as noted, primarily the "Out of Scope" section).

