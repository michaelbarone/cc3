### Epic 2: Admin Dashboard - Core Administration & Multi-User Setup
**Goal:** Provide administrators with tools to manage essential application settings (branding), control user registration, create and manage other user accounts (defining admin/user roles, including disabling accounts), and enable all users (including the initial admin) to manage their own profiles (avatar support). This establishes core administrative functions and enables multi-user scenarios.

* **Story 2.1: Create Basic Admin Dashboard Layout and Navigation**
    * **As an** Administrator,
    * **I want** to access a dedicated and secure `/admin` section with a persistent Left Sidebar (fixed width, always expanded on desktop/tablet) containing direct links to all key admin functions in a defined order, and a main content area for these functions.
    * **So that** I have a clear, organized, and protected entry point for all administrative tasks.
    * **Acceptance Criteria:**
        * `[ ]` (Admin Route Protection) All routes under the `/admin/*` path (e.g., `/admin`, `/admin/users`, `/admin/branding`) are strictly protected.
        * `[ ]` Only users authenticated with the `ADMIN` role (as determined from their session, e.g., `session.user.role === 'ADMIN'`) can successfully access `/admin/*` routes.
        * `[ ]` Authenticated users with a `USER` role who attempt to access any `/admin/*` route are redirected to a non-admin page (e.g., the main `/dashboard`) and may be shown a "Not Authorized" message (e.g., via a toast notification or a query param on redirect).
        * `[ ]` Unauthenticated users attempting to access any `/admin/*` route are redirected to the `/login` page (behavior established in Story 1.6 covers this).
        * `[ ]` The access control mechanism is implemented by extending the existing middleware (from Story 1.6) to check user roles, or through specific layout/page-level checks for routes under `/admin`.
        * `[ ]` (Admin Dashboard Layout) A dedicated layout component for the admin section is created (e.g., `/app/admin/layout.tsx`).
        * `[ ]` This layout uses Material UI (MUI) components and defines a consistent structure for all pages within the `/admin` section.
        * `[ ]` (Admin Navigation Sidebar) A persistent Left Sidebar (e.g., MUI `Drawer` with `variant="permanent"`) is implemented for admin navigation.
            * `[ ]` The sidebar has a fixed width (e.g., 240px-280px) and is always expanded on desktop/tablet viewports (≥768px). Mobile optimization for the admin sidebar itself (e.g., making it collapsible or a drawer on mobile) is not part of this story for MVP; admin functions are primarily desktop/tablet focused.
            * `[ ]` The main content area for admin pages is displayed to the right of the sidebar.
        * `[ ]` The Admin Left Sidebar displays direct navigation links (e.g., MUI `ListItem` components) in the following agreed-upon order:
            1.  Admin Dashboard (Overview) (links to `/admin`)
            2.  User Management (links to `/admin/users` - Story 2.3 UI)
            3.  URL Groups (links to `/admin/url-groups` - Story 3.5 UI)
            4.  Global URLs (links to `/admin/global-urls` - Story 3.6.5 UI)
            5.  Application Branding (links to `/admin/branding` - Story 2.4 UI)
            6.  Application Settings (links to `/admin/settings` - page grouping Registration Control & Log Retention settings from Story 2.5 & 5.6)
            7.  System Operations (links to `/admin/system/operations` - for Backup & Restore UI from Story 5.3)
            8.  System Statistics (links to `/admin/stats` - Story 5.4 UI)
            9.  Activity Log (links to `/admin/activity-log` - Story 5.5 UI)
        * `[ ]` Clicking these navigation links routes to the respective admin page (which can initially render a simple "Feature Coming Soon" or "[Section Name] Page" message within the admin layout if the specific page's UI is built in a subsequent story).
        * `[ ]` The navigation menu visually indicates the currently active/selected admin section.
        * `[ ]` (Admin Area Landing Page) The base `/admin` route (e.g., `/app/admin/page.tsx`) renders a basic landing page for the admin dashboard (e.g., "ControlCenter Administration" heading, a brief welcome message) utilizing the common admin layout component.
        * `[ ]` (Visual Consistency) The admin dashboard, including the sidebar and content area, has a clean, professional, and uncluttered appearance, using the application's established MUI themes (light/dark) and aligning with overall design principles.

* **Story 2.2: Implement User Profile Management (Self-Service)**
    * **As an** Authenticated User (including Administrators viewing their own profile),
    * **I want** to be able to view my profile information (including my read-only login `name` as a disabled field), update my password (with inline error messages, min 4 char MVP complexity), and upload (with drag-and-drop support and file select button; JPG/PNG/GIF, max 1MB; optional preview) or remove my avatar image.
    * **So that** I can personalize my account and maintain its security.
    * **Acceptance Criteria:**
        * `[ ]` (Profile Page UI & Access) A dedicated "My Profile" page is created at `/settings/profile`, protected, accessible only by the currently authenticated user.
        * `[ ]` The page displays the user's login `name` in an MUI `TextField` styled as disabled (read-only).
        * `[ ]` The user's current avatar (MUI `Avatar` from `User.avatarUrl`) or an initials fallback is displayed. Initials generation: 1st letter of name, or 1st of first 2 words if space; background color programmatically determined from name hash.
        * `[ ]` Page uses MUI v6, adheres to app themes, and is responsive. It is organized into clear sections (e.g., Profile Information, Change Password, Avatar Management, Layout & Appearance Preferences from Story 4.1).
        * `[ ]` (Password Change Section) Includes MUI `TextFields` for "Current Password" (visible/required only if `User.passwordHash` is set), "New Password," "Confirm New Password" (all masked, with visibility toggles).
        * `[ ]` Client-side validation for password change: new passwords match, meet MVP complexity (min 4 characters). Error messages displayed inline next to relevant fields.
        * `[ ]` Submitting password change calls `POST /api/user/profile/change-password`. Backend verifies current password (if applicable), hashes new password, updates `User.passwordHash`. Success/error feedback via MUI `Snackbar`/`Alert`.
        * `[ ]` (Avatar Management Section) Displays current avatar. "Upload/Change Avatar" MUI `Button` triggers file input. A designated area also supports drag-and-drop for image files.
        * `[ ]` Allowed avatar file types: JPG, PNG, GIF (client-side validation for `image/jpeg`, `image/png`, `image/gif`). Max file size: 1MB (client-side validation). Error messages for validation failures.
        * `[ ]` (Optional) Preview of selected image shown before confirming upload.
        * `[ ]` Confirming avatar upload calls `POST /api/user/profile/avatar` (FormData). Backend validates (type, size), saves to `/public/avatars/[userId].[ext]` (overwriting old file), updates `User.avatarUrl`. UI updates avatar display. Session `avatarUrl` updates if part of session.
        * `[ ]` "Remove Avatar" MUI `Button` available. Calls `DELETE /api/user/profile/avatar`, sets `User.avatarUrl` to null, deletes server file, UI shows fallback. Confirmation dialog before removal.
        * `[ ]` (Backend API Endpoints) Secure APIs under `/api/user/profile/` for changing password, uploading avatar, and removing avatar. Endpoints are user-specific, validate inputs, return JSON responses.

* **Story 2.3: Implement Admin User Management (List, Create, Edit Roles/Names, Disable/Enable Accounts)**
    * **As an** Administrator,
    * **I want** a UI to list all users (showing name, role, avatar, `isActive` status, dates), create new users (name, role; `passwordHash: null`, `isActive: true` default; corresponding `UserSetting` record also created), edit existing users' login `name` (ensuring uniqueness) and `role` (sole admin safeguard), and disable/enable user accounts (`User.isActive`), all with confirmation dialogs.
    * **So that** I can manage the user base, credentials, permissions, and account status.
    * **Acceptance Criteria:**
        * `[ ]` (User Management Page) `/admin/users` page created, uses admin layout (Story 2.1), `ADMIN` role access only.
        * `[ ]` (User List Display) Page displays an MUI `Table` of all registered users. Columns include: Avatar (from `User.avatarUrl` or initials fallback), Login Name (`User.name`), Role (`User.role`), Status (`User.isActive` as "Active"/"Disabled" MUI `Chip`), Last Login (`User.lastLoginAt` formatted), Created At (`User.createdAt` formatted), and an "Actions" column.
        * `[ ]` For MVP, the user list displays all users without server-side pagination (client-side pagination via MUI Table if many users). Optional client-side sorting by name, role, status.
        * `[ ]` (Create New User UI) A prominent "Create New User" MUI `Button` (`variant="contained"`, green/success color) is present (e.g., above the table).
        * `[ ]` Clicking button opens an MUI `Dialog` with a form. Form fields: `name` (MUI `TextField`, required), `role` (MUI `Select` or `RadioGroup` for USER/ADMIN, defaults to USER). No password field is presented to the admin.
        * `[ ]` Client-side validation for `name` (required).
        * `[ ]` "Save" button in dialog triggers a confirmation dialog: "Are you sure you want to create a new user with name '[name]' and role '[role]'? They will log in without a password initially and will need to set their own."
        * `[ ]` On confirmation, `POST /api/admin/users` is called. Backend verifies admin, ensures new `name` is unique, creates `User` (with `passwordHash: null`, `isActive: true` by default) and a corresponding default `UserSetting` record (Story 4.1).
        * `[ ]` User list on page refreshes/updates. Success or error (e.g., duplicate name) message shown via MUI `Snackbar`. Dialog closes on success.
        * `[ ]` (Edit User UI) Each user row in the table has an "Actions" column containing an "Edit" MUI `IconButton`.
        * `[ ]` Clicking "Edit" opens an MUI `Dialog` pre-filled with the user's current `name`, `role`, and `isActive` status.
        * `[ ]` Admin can edit `name` (MUI `TextField`). Client validation: not empty.
        * `[ ]` Admin can edit `role` (MUI `Select`/`RadioGroup`).
        * `[ ]` Admin can toggle `isActive` status (MUI `Switch` labeled "Account Active").
        * `[ ]` "Save Changes" button in dialog. Before submitting, a confirmation dialog appears: "Are you sure you want to save these changes for user '[original_name_or_current_form_name]'?".
        * `[ ]` On confirmation, `PUT /api/admin/users/[userId]` is called with all updatable fields.
        * `[ ]` Backend for update: Verifies admin. If `name` changed, ensures new `name` is unique. Safeguard: admin cannot change own role from `ADMIN` to `USER` if sole active `ADMIN`. Safeguard: admin cannot disable own account if sole active `ADMIN`. Updates `User` record fields (`name`, `role`, `isActive`).
        * `[ ]` User list refreshes. Success/error messages. If login `name` changed, a note reminds admin the user's login has changed.
        * `[ ]` (Delete User Action - Placeholder) Each user row has a "Delete" MUI `IconButton`. For MVP, this button is **disabled** with a tooltip "User deletion feature to be implemented post-MVP." (User deletion was not explicitly scoped for MVP admin actions).
        * `[ ]` (Backend API Endpoints) Secure APIs under `/api/admin/users`: `GET /` (list all users, including `isActive` status and `UserSetting` for session in Story 1.3), `POST /` (create user with `name`, `role`; sets `passwordHash: null`, `isActive: true`, and creates default `UserSetting`), `PUT /[userId]` (update user's `name`, `role`, `isActive`). Endpoints ensure requester is `ADMIN` and perform all necessary server-side validations and safeguards.

* **Story 2.4: Implement Application Branding Management (Revised with Confirmation Dialogs)**
    * **As an** Administrator,
    * **I want** to be able to customize the application's displayed name, upload (with drag-and-drop support and file select button) a custom logo image (JPG/PNG/SVG), and upload (with drag-and-drop support and file select button) a custom favicon image (ICO/PNG) through the admin dashboard, with confirmations before changes are applied.
    * **So that** I can personalize the appearance of my ControlCenter instance.
    * **Acceptance Criteria:**
        * `[ ]` (Branding Page UI) `/admin/branding` page, admin layout, `ADMIN` only. Displays current branding settings, forms/inputs to change.
        * `[ ]` (App Name Customization) MUI `TextField` for "Application Name," pre-filled (default "ControlCenter"). General "Save Branding Settings" button for page. Confirmation dialog ("Are you sure... update branding settings?") before API call. API saves name to `SystemSetting` table. Success message. App name in UI (e.g., browser title, header) dynamically updates.
        * `[ ]` (Logo Image Upload) "Application Logo" section: displays current logo/placeholder. "Upload New Logo" (drag-and-drop zone + MUI `Button` file select; JPG/PNG/SVG, max 1MB defined limit). Client validation. Optional preview. Saving branding triggers API upload. Backend validates, saves to `/public/branding/logo.[ext]` (overwrites), stores path in `SystemSetting`. UI/app logo updates. "Remove Custom Logo" option (with confirmation) clears setting/file, app reverts to default bundled logo.
        * `[ ]` (Favicon Image Upload) "Application Favicon" section: displays current favicon/default. "Upload New Favicon" (drag-and-drop zone + button; ICO/PNG, defined dimensions e.g., 32x32, size e.g., max 100KB). Client validation. Saving branding triggers API upload. Backend validates, saves to `/public/favicon.ico` (or similar), stores path/flag in `SystemSetting`. Browser favicon updates (may need hard refresh). "Remove Custom Favicon" option (with confirmation) reverts to default.
        * `[ ]` (Persistence & Application) Branding settings (App Name, Logo path, Favicon path) stored in `SystemSetting` model. Defaults used if not set. App layout dynamically uses settings for `<title>`, `<link rel="icon">`.
        * `[ ]` (Backend APIs) Secure APIs under `/api/admin/branding`: `GET /` (get settings), `PUT /` (update text settings like App Name, save paths from file uploads, handle deletions from "Remove" actions). Separate file upload handling within this or dedicated endpoints if cleaner. Admin only, validations.

* **Story 2.5: Implement User Registration Control Setting (Finalized with Confirmation)**
    * **As an** Administrator,
    * **I want** to be able to enable or disable the ability for new user accounts to be created by an administrator within the application via a setting in the admin dashboard, with a confirmation before the change is applied. (Default: ENABLED).
    * **So that** I have clear control over the expansion of the user base and can prevent new user additions (even by other admins) when not desired.
    * **Acceptance Criteria:**
        * `[ ]` (Registration Control UI) Section on admin settings page (e.g., `/admin/settings`). `ADMIN` role only. Displays current state ("Admin User Creation: Enabled/Disabled"). MUI `Switch` "Allow New User Creation by Admins."
        * `[ ]` (Persistence, Retrieval, Confirmation) Setting state (`allowAdminUserCreation: Boolean @default(true)`) in `SystemSetting` model. Toggle change -> Confirmation dialog: "Are you sure... [enable/disable] new user creation by admins?". On confirm, API (`PUT /api/admin/settings`) saves. Success `Snackbar`. Setting fetched/displayed correctly.
        * `[ ]` (Effect of Setting) If disabled: "Create New User" button (Story 2.3) hidden/disabled; backend API (`POST /api/admin/users`) rejects creation. If enabled: functionality active.
        * `[ ]` (Default State) `allowAdminUserCreation` is **ENABLED** by default in `SystemSetting`.
        * `[ ]` (Backend API) System settings API (`GET /api/admin/settings`, `PUT /api/admin/settings`) handles this boolean setting. Admin only.
