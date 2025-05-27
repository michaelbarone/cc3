## 11. Initial Architect Prompt

Based on the comprehensive requirements detailed in this Product Requirements Document for the **ControlCenter** project, the following technical guidance, decisions, and assumptions should inform your architecture analysis and design when operating in "Architecture Creation Mode":

**Key Technical Pillars (from PRD Sections 5 & 6):**

* **Repository & Service Architecture Decision:** Monorepo. Next.js application handles both frontend and backend (API) functionalities. Architecture is a Monolith. Rationale: Simplicity for a personal application with limited users.
* **Core Technology Stack:**
    * Frontend: Next.js 15.2.2 (App Router), React 19, TypeScript 5, Material UI v6, Emotion.
    * Backend: Next.js API Routes, Prisma ORM v6.5.0, NextAuth.js v4, JWT.
    * Database: SQLite.
    * State Management (Client): React Context/Hooks (including for Iframe State and User Settings).
    * Testing: Vitest, React Testing Library, MSW, Happy DOM, Playwright (E2E).
    * Dev Tooling: ESLint, Prettier, Husky, Conventional Commits, Docker.
* **Deployment:** Local home server via Docker container.

**Key Functional & Non-Functional Drivers for Architecture:**
* **User Authentication & Authorization:** Robust role-based (ADMIN/USER) access control is critical. Secure session management. First-run admin setup flow.
* **Content Management (Admin-centric for MVP):** Admins manage a global library of URLs and URL Groups. URLs have titles, optional paths to uploaded favicons (with best-effort auto-discovery of icon links), notes, etc. Groups organize URLs with group-specific titles and display order. Users are assigned access to specific groups.
* **User Dashboard Experience (Highly Interactive & Personalized - Epic 4):**
    * User-selectable desktop menu positions (Top Menu vs. Side Menu), with distinct layouts and behaviors for each, including how the main application header adapts or is replaced.
    * Mobile always uses a collapsible drawer for main navigation, triggered by a hamburger icon in a persistent top AppBar.
    * Advanced iframe management: multiple iframes mounted in DOM, `visibility:hidden` for inactive ones to preserve state, `src`/`data-src` pattern for loading/unloading content.
    * Client-side state management (e.g., `IframeProvider`, `useIframeManager`) to track active URL and loaded/unloaded status of all iframes.
    * Specific URL item visual indicators (opacity for loaded/unloaded, underline/border for active).
    * Click (activate/load/reload) and Long-press (2s, unload with progress bar, haptic feedback on mobile) interactions for URLs.
    * Persisted user preferences for theme (Light/Dark/System) and menu position.
* **System Operations (Admin):**
    * Asynchronous Backup (DB + all assets + version manifest) and Restore (from uploaded archive, includes DB migration). APIs and Admin UI for these, including backup file management (list, download, delete).
    * Activity Logging (structured JSON details, persistent, admin view with pagination).
    * Configurable Log Retention (default 180 days, admin UI to change, automated pruning task, manual trigger).
* **Performance:** Snappy UI, fast initial load, graceful handling of iframe loading. Efficient backend operations (DB queries, backup/restore, logging).
* **Security:** Standard web security practices (XSS prevention, secure auth).
* **Reliability:** Designed for continuous operation on a home server. Data integrity via backups.

**Architectural Focus Areas:**
* Clear separation of concerns between frontend components, client-side state management, Next.js API routes, and backend services/database interactions.
* Design for testability across all layers.
* Robust error handling and user feedback mechanisms.
* Efficient data fetching patterns, especially for personalized content on the dashboard.
* Secure implementation of file uploads (avatars, branding images, URL favicons) and file system operations (backup/restore, asset storage).
* Implementation of the scheduled task for log pruning.
* Ensuring the "Very Technical" workflow chosen (developers implement from these detailed stories) is supported by a clear and understandable architecture.

Please use this PRD as your primary input. The detailed User Stories and Acceptance Criteria within each Epic provide granular requirements for all features.
