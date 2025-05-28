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
    * **I want** to integrate Prisma ORM (v6.5.0) into the Next.js project, configure it to use an SQLite database, and define the initial `User` schema including `name` as identifier, optional passwords, a `lastLoginAt` field, an `isActive` status flag, and appropriate referential actions (`onDelete: SetNull`) for relations to `Url` and `Group` creator fields. This process must also ensure a corresponding default `UserSetting` record is created when a `User` is created.
    * **So that** the application has robust data persistence for users, supporting authentication, activity tracking, account status management, initial user preferences, and maintains integrity if creator users are deleted.
    * **Acceptance Criteria:**
        * `[ ]` Prisma CLI (compatible with v6.5.0) is installed as a project development dependency.
        * `[ ]` Prisma Client (compatible with v6.5.0) is installed as a project dependency.
        * `[ ]` Prisma is initialized within the project (e.g., via `npx prisma init`), creating the `/prisma` directory and a base `schema.prisma` file.
        * `[ ]` The `datasource db` block in `prisma/schema.prisma` is configured with `provider = "sqlite"`.
        * `[ ]` The `url` for the datasource is correctly set to point to an SQLite database file located at `/data/controlcenter.db` (e.g., `url = "file:../data/controlcenter.db"` if schema is in `/prisma`, or configured via an environment variable like `DATABASE_URL=file:./data/controlcenter.db`).
        * `[ ]` The `/data` directory exists at the project root.
        * `[ ]` A `User` model is defined in `prisma/schema.prisma` with fields: `id` (String, `@id @default(cuid())`), `name` (String, `@unique`), `passwordHash` (String, Optional `?`), `avatarUrl` (String, Optional `?`), `role` (`UserRole` enum: USER, ADMIN; `@default(USER)`), `lastLoginAt` (DateTime, Optional `?`), `isActive` (Boolean, `@default(true)`), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`).
        * `[ ]` The `User` model includes relation fields: `settings UserSetting?`, `addedUrls Url[] @relation("AddedUrls")`, `createdGroups Group[] @relation("CreatedGroups")`, `groupAccesses UserGroupAccess[]`, `activityLogs ActivityLog[] @relation("UserActivityLogs")`.
        * `[ ]` A `UserRole` enum (`USER`, `ADMIN`) is defined.
        * `[ ]` A Prisma migration is successfully generated based on the defined `User` model (and `UserSetting` model if defined concurrently for AC 1.2.9).
        * `[ ]` This migration, when applied (e.g., via `npx prisma migrate dev`), successfully creates/alters the `User` table (and `UserRole` enum) in the SQLite database.
        * `[ ]` The generated migration file(s) are present in the `/prisma/migrations` directory.
        * `[ ]` Prisma Client is successfully (re)generated and is usable within the application code.
        * `[ ]` Basic CRUD (Create, Read, Update, Delete) operations on the `User` table, including interaction with `isActive` and `lastLoginAt` fields, are functional (verified via a test script or simple API route).
        * `[ ]` A mechanism is established (e.g., within the seeding script or user creation service) to seed a default 'admin' user (`name: "admin"`, `role: ADMIN`, `isActive: true`, `lastLoginAt: null`) into the database if one doesn't already exist. This process also creates their corresponding default `UserSetting` record (as per Story 4.1 requirements).

* **Story 1.3: Implement NextAuth.js for Core Authentication Logic**
    * **As a** Developer/System,
    * **I want** to integrate and configure NextAuth.js (v4) to handle user authentication using the `name` field and an optional password, check for account `isActive` status, leverage the Prisma adapter, establish JWT-based session management with HTTP-only cookies, support configurable session durations, include "Remember Me" functionality, and include the `isActive` status and user preferences (theme, menuPosition from Story 4.1 via `UserSetting`) in the session.
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
            * The `jwt` callback includes `id`, `name`, `role`, `isActive` status, `theme`, and `menuPosition` in the JWT payload (fetching from `User` and related `UserSetting`).
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
        * `[ ]` The endpoint fetches all `User` records from the database using Prisma, ordered by their `createdAt` field in ascending order.
        * `[ ]` Each fetched `User` record is transformed into a `UserTile` object with the following structure:
            ```typescript
            interface UserTile {
              id: string;
              username: string;        // Mapped from User.name
              avatarUrl: string | null;  // Mapped from User.avatarUrl
              requiresPassword: boolean; // true if User.passwordHash is not null and not empty, else false
              isAdmin: boolean;        // true if User.role is 'ADMIN', else false
              lastLoginAt?: string;   // Mapped from User.lastLoginAt, serialized to ISO 8601 string if set
            }
            ```
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
        * `[ ]` (UI Layout & Styling) Displays user tiles (from Story 1.3.5 API) in a responsive grid (MUI `Grid`: 4/desktop, 2/tablet, 1/mobile). Uses MUI v6, clean/modern/themed, fully responsive.
        * `[ ]` (Individual User Tile Visuals) Tile is card-like (MUI `Card`/custom) with elevation. Initial state: `UserTile.username` middle-center. Displays avatar (if `UserTile.avatarUrl`, else initials fallback: 1st letter of `username`, or 1st of 2 words if space; background color programmatically determined based on hash of `username`). Optional avatar as tile background. Lock icon (e.g., MUI `LockIcon`) on tile if `UserTile.requiresPassword` is true. Gradient overlay for text readability/appeal.
        * `[ ]` (User Tile Interaction & Transformation) Hovering over a tile: subtle visual effect (e.g., increased elevation). Tiles have clear focus states. Clicking password-protected tile: inner section smoothly animates sliding upward; `UserTile.username` animates to top of tile; password input, "Remember Me" checkbox, and "Login" button are revealed.
        * `[ ]` (New) If a password-protected tile is in its transformed state (showing password form), clicking *outside* that specific active tile reverts it smoothly to its initial state (username centered, form hidden).
        * `[ ]` (In-Tile Password Form Elements) For transformed tile: MUI `TextField` for password (masked), "Login" MUI `Button`, password visibility toggle icon, "Remember Me" MUI `Checkbox`.
        * `[ ]` (Client-Side Auth Logic) Clicking passwordless `UserTile`: immediate `signIn()` (username, "Remember Me" state). Submitting in-tile password form: `signIn()` (username, password, "Remember Me" state). Redirect to `/dashboard` on success. Client-side validation before `signIn`.
        * `[ ]` (User Feedback & Error Handling) Loading indicator (e.g., on tile/button) during `signIn`. If `signIn` fails: generic, page-level MUI `Alert` (e.g., top/bottom of page or Snackbar/Toast) with "Invalid name or password." If in-tile form failed, the tile reverts to its initial state.
        * `[ ]` (Accessibility & Animations) Keyboard nav for tiles (arrow keys, responsive grid aware), tiles activatable (`Enter`/`Space`). Focus moves to password field in transformed tile. In-tile form keyboard accessible. `Escape` in form cancels, reverts tile. ARIA labels/roles. Smooth animations (300ms) for hover, selection, slide-up.
        * `[ ]` (Integration with Story 1.5) Structured for conditional "First Run" UI.

* **Story 1.5: Implement "First Run" Experience on Login Page**
    * **As an** Initial Administrator,
    * **I want** to be presented with special options on the tile-based login page when the application is in a "first run" state (defined by a single default admin user existing who has never logged in). This should allow me to either see a (currently disabled for Epic 1) option to restore from backup, or to log in as the default 'admin' without a password. This passwordless login must then direct me to a mandatory password setup page. If I cancel this password setup (via a "Cancel Setup" button), the application should remain in the "first run" state for subsequent login attempts (admin `lastLoginAt` not updated until password set).
    * **So that** I can easily and securely perform the initial setup of the ControlCenter application, establish the primary admin credentials, and have the option to restart the setup if needed.
    * **Acceptance Criteria:**
        * `[ ]` (First Run State Determination) Login page component determines "first run" status via API/backend logic (server-side verifies: exactly one `User`, `name=="admin"`, `role==ADMIN`, `User.lastLoginAt==null`). Status stored in page state.
        * `[ ]` (Conditional UI for "Restore from Backup") If "first run": "Restore System from Backup" MUI `Button` displayed, **disabled**. Tooltip: "Full restore functionality will be enabled with Admin features."
        * `[ ]` (Conditional UI & Interaction for 'Admin' Tile) If "first run": 'admin' user tile distinct/highlighted. Clicking it presents "Login & Setup Admin Account" option (bypasses password form).
        * `[ ]` (Passwordless Admin Login Process) Activating "Login & Setup" calls `signIn()` for 'admin' (passwordless). `authorize` (Story 1.3) allows if backend confirms first run (`User.lastLoginAt` is null). Session established. `User.lastLoginAt` for admin is **NOT yet updated**.
        * `[ ]` (Mandatory Admin Password Setup Page & Flow) After passwordless login, redirect to `/first-run/set-admin-password`. Page indicates mandatory setup. Form: "New Password," "Confirm New Password" (MUI `TextFields`, masked, client validation: match & min 4 chars). "Set Password" & "Cancel Setup" MUI `Buttons`.
            * Submitting "Set Password": `POST /api/first-run/set-admin-password`. Backend verifies first-run admin state, hashes new password, updates `User.passwordHash`, **updates `User.lastLoginAt`**. Redirect to `/dashboard` on success. Success/error messages.
            * Clicking "Cancel Setup": Current session terminated (`signOut()`). Redirect to `/login`. `User.lastLoginAt` remains null. System stays in "first run".
        * `[ ]` Access to other app parts from `/first-run/set-admin-password` restricted until password set or cancelled.
        * `[ ]` (Conclusion of "First Run" UI State) After admin password successfully set (`User.lastLoginAt` updated, `passwordHash` set), subsequent visits to `/login` no longer show "first run" UI. 'Admin' tile prompts for the newly set password.

* **Story 1.6: Implement Basic Protected Routes, Middleware, and Client-Side Session Validation**
    * **As the** System,
    * **I want** to secure specific application routes using Next.js middleware that checks user session status and account `isActive` state, and implement a client-side mechanism (e.g., in root layout) to proactively validate session activity by checking `session.user.isActive` and logging out if false.
    * **So that** sensitive application content is protected, only active users can maintain access, and the user experience is responsive to changes in account status.
    * **Acceptance Criteria:**
        * `[ ]` (Middleware Implementation) Next.js middleware file created. `matcher` configured for protected routes (e.g., `['/dashboard/:path*', '/settings/:path*', '/admin/:path*']`).
        * `[ ]` (Session & Account Status Checking in Middleware) Middleware retrieves session/token (e.g., using `getToken`). Verifies user authenticated AND `token.isActive === true`.
        * `[ ]` (Redirection) If unauth or `token.isActive === false`, redirect to `/login` with `callbackUrl`.
        * `[ ]` (Access for Authenticated & Active Users) If auth and `token.isActive === true`, request proceeds.
        * `[ ]` (Exclusion of Public/Auth Routes) `/login`, `/api/auth/**`, `/api/auth/user-tiles` not blocked by this auth check.
        * `[ ]` (Client-Side Proactive Session Validation) Logic in global client component (e.g., root `layout.tsx`): uses `useSession()`. On load and potentially on triggers like window focus or navigation events (if deemed necessary for MVP), checks `session.user.isActive`. If `false` while `status` is 'authenticated', programmatically calls `signOut({ callbackUrl: '/login' })`.
        * `[ ]` (Role-Based Auth Note) Code comment in middleware indicating where future role-based authorization checks would be added.
        * `[ ]` (Verification) Manual and/or automated tests confirm redirection and access based on authentication and `isActive` status. Client-side proactive logout for inactive sessions is verified.
