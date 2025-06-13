### Epic 5: Admin Dashboard - System Operations & Monitoring
**Goal:** Equip administrators with critical system operation tools, including asynchronous database backup (with manifest) and restore functionality (with manifest reading & migration handling, UI for file management, and pre-restore backup suggestion), basic system statistics, user activity tracking (with structured JSON details), and configurable log retention (default 180 days, with automated pruning, manual trigger, and pruning logged to activity log).

* **Story 5.1: Implement Backend Logic and API for Application Backup (Async, with Backup Manifest)**
    * **As an** Administrator (interacting via a future Admin UI),
    * **I want** a secure backend API endpoint that initiates a full application backup (database, assets, manifest with DB schema version) as an **asynchronous background process**, providing an immediate acknowledgment that the backup has started.
    * **So that** I can trigger backups without waiting for the entire process to complete in the UI, and the system can perform potentially long-running backups efficiently without tying up the HTTP request.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint for Backup Initiation) A new secure API endpoint `POST /api/admin/system/backup` is created.
        * `[ ]` This endpoint requires the requester to be authenticated with an `ADMIN` role. Unauthorized (401) or forbidden (403) access attempts are rejected with appropriate HTTP error responses.
        * `[ ]` (Data to be Included in Backup) The backup process must reliably include: The primary SQLite database file (e.g., `/data/controlcenter.db`), all user-uploaded avatar image files (`/public/avatars/`), all admin-uploaded global URL icon files (`/public/url_favicons/`), and all admin-uploaded application branding image files (`/public/branding/`).
        * `[ ]` Environment files (e.g., `.env`, `.env.local`) are explicitly **excluded** from the backup archive.
        * `[ ]` (Backup Archive Creation - Background Process) Upon receiving a valid request, the API initiates a background process. This process collects data, creates the metadata manifest file (AC 5.1.4), and packages them into a single compressed `.zip` archive with a timestamped name (e.g., `controlcenter_backup_YYYYMMDD_HHMMSS.zip`), maintaining relative directory structure.
        * `[ ]` (Backup Manifest File) A `backup_manifest.json` is included in the `.zip` archive root, containing `backupCreatedAtTimestamp` (ISO), `databaseSchemaVersionId` (last Prisma migration ID), and optional `applicationVersion` (from `package.json`/git hash).
        * `[ ]` (Backup Storage - Background Process) The background process saves the backup archive to the designated secure server directory (e.g., `/data/backups/`, configurable, not publicly accessible). Each backup operation creates a new archive file (no auto-rotation for MVP).
        * `[ ]` (API Response & Feedback - Async) If backup successfully **initiated**: API returns HTTP 202 Accepted immediately with JSON message "Backup process initiated successfully. The backup will be available shortly." (Optional task ID). If API fails to *initiate*: returns 4xx/500 error. Errors *during background process* are logged server-side.
        * `[ ]` (Database Integrity During Backup - Background Process) The background backup process uses a method that attempts to ensure SQLite database integrity (e.g., online backup API or direct copy with documented considerations).
        * `[ ]` (Resource Considerations & Asynchronous Execution) Backup creation is an asynchronous background task, separate from the HTTP request-response cycle.

* **Story 5.1.5: Implement API Endpoints for Managing Backup Files (List, Download, Delete)**
    * **As an** Administrator (interacting via the Admin UI),
    * **I want** secure backend API endpoints that allow me to list all available backup archive files stored on the server, download a specific backup file, and delete a specific backup file.
    * **So that** I can manage the lifecycle of my application backups directly through the admin interface, including obtaining copies for offsite storage or removing old backups.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint Security) All new endpoints under `/api/admin/system/backups/` require the requester to be authenticated with an `ADMIN` role.
        * `[ ]` (List Backup Files: `GET /api/admin/system/backups`) Reads contents of the designated backup storage directory. Returns a JSON array of objects, each representing a backup file: `{ filename, createdAtTimestamp (from filename/metadata), sizeBytes (file size), databaseSchemaVersionId?, applicationVersion? (optional, if manifest parsed) }`. List sorted by `createdAtTimestamp` descending (newest first). Returns empty array if no backups. Handles errors.
        * `[ ]` (Download Backup File: `GET /api/admin/system/backups/[filename]`) Accepts `filename` (validated, no path traversal). Verifies file exists. Streams the `.zip` file with appropriate HTTP headers (`Content-Disposition: attachment; filename="[filename]"`, `Content-Type: application/zip`). Returns 404 if not found/invalid. Handles file read errors.
        * `[ ]` (Delete Backup File: `DELETE /api/admin/system/backups/[filename]`) Accepts `filename` (validated). Verifies file exists. Deletes specified `.zip` file from server. Returns HTTP 204 No Content or 200 OK with success message. Returns 404 if not found/invalid. Handles file deletion errors.
        * `[ ]` (Security Considerations) Filename parameters are sanitized. Access to backup directory strictly controlled by backend.

* **Story 5.2: Implement Backend Logic and API for Application Restore from Backup (Async, Refined Restore Order, Manifest Reading & Migration Handling)**
    * **As an** Administrator (interacting via Admin UI or the "First Run" UI),
    * **I want** a secure backend API endpoint that allows me to upload a previously created backup archive (`.zip` file). This process must restore the application's state (SQLite database and all associated asset files like avatars, URL icons, branding images) as an **asynchronous background process**, first restoring the database and applying all necessary database migrations, then restoring asset files, and provide an immediate API acknowledgment that the restore has started.
    * **So that** I can reliably recover the entire application state from a backup in case of data loss or system corruption, or perform an initial system setup using the "First Run Restore" feature, with a safer process and without tying up the UI.
    * **Acceptance Criteria:**
        * `[ ]` (API Endpoint for Restore Initiation) `POST /api/admin/system/restore`. Accepts `.zip` file upload. Authentication: `ADMIN` role (with considerations for "First Run Restore" context).
        * `[ ]` (Backup Archive Validation & Secure Processing - Background Task) Uploaded file validated as `.zip`. Archive unzipped securely to temporary server location by background task. Background task verifies presence of `controlcenter.db`, `backup_manifest.json`, asset folders. Aborts with server-side error log if critical files missing.
        * `[ ]` (Manifest Reading and Logging - Background Task) `backup_manifest.json` is read by background task. `backupCreatedAtTimestamp`, `databaseSchemaVersionId`, `applicationVersion` logged.
        * `[ ]` (Database Restoration and Migration First - Background Task) Temporary backup of current live SQLite DB file made. Live SQLite DB file replaced with backup's DB. Prisma migrations (equivalent to `npx prisma migrate deploy`) programmatically triggered on restored DB. Error Handling: If DB replace or migration fails, background task aborts, attempts restore of pre-restore DB backup, logs detailed error server-side. Asset restoration (AC 5.2.5) is not attempted.
        * `[ ]` (Asset File Restoration - Background Task, Conditional) **Only if** DB restore/migrations successful: (Optional) temp backups of live asset dirs made. Live asset dirs cleared/replaced with archive content. File permissions ensured. Error Handling: If asset restoration fails, error logged server-side; system might be in mixed state (error message should advise check/re-attempt).
        * `[ ]` (API Response & Feedback - Async) If restore successfully **initiated**: API returns HTTP 202 Accepted immediately. JSON response: "Restore process initiated successfully from backup '[backup_filename]'. The application may restart or require a new login upon completion. Please monitor the application or check logs for final status." If API fails to *initiate*: returns 4xx/500 error. Detailed success/failure of *background restore process* logged server-side.
        * `[ ]` (Post-Restore System State - Result of Background Task) After successful background restore: Application restart recommended/attempted if feasible. All user sessions considered invalidated. If "first run", system no longer in that state.

* **Story 5.3: Develop Admin UI for Backup, Restore, and Backup File Management**
    * **As an** Administrator,
    * **I want** an intuitive user interface within the admin dashboard that allows me to:
        1.  Initiate asynchronous application backups.
        2.  View a list of existing backup files stored on the server, with options to download or delete them.
        3.  Initiate an asynchronous application restore by uploading a backup archive, with clear warnings, a suggestion to perform a fresh backup first, and appropriate feedback throughout the process (including a UI lock-down overlay during restore initiation).
    * **So that** I can easily and comprehensively manage the data safety, backup lifecycle, and recovery of my ControlCenter instance directly through the application UI.
    * **Acceptance Criteria:**
        * `[ ]` (Admin Page & Access) "/admin/system/operations" page (or similar), admin layout, `ADMIN` only. Sections: "Manage Existing Backups," "Create New Backup," "Restore Application."
        * `[ ]` ("Manage Existing Backups" UI) On load/refresh, `GET /api/admin/system/backups`. Loading/error. Backups in MUI `Table`/`List` (filename, createdAt, size). Sorted newest first. "No backups found" message. Actions per backup: "Download" `Button` (`GET .../[filename]`); "Delete" `Button` (MUI `IconButton` with appropriate color, Confirmation dialog "Are you sure...delete '[filename]'?" -> `DELETE` API, refresh list, success/error `Snackbar`). "Refresh List" MUI `Button`.
        * `[ ]` ("Create New Backup" UI - Async) "Create New Backup" `Button`. Confirmation: "Are you sure...run in background?". On confirm, `POST /api/admin/system/backup`. Loading indicator during API initiation. On 202 Accepted: `Snackbar` "Backup initiated...Refresh list soon." On API init failure: error `Snackbar`.
        * `[ ]` ("Restore from Backup" UI - Async) Section displays strong warnings. Prominent suggestion/button: "Recommended: Create a fresh backup now?" -> triggers Create Backup flow. File input (`<input type="file" accept=".zip">`) + MUI `Button`. "Upload and Restore" `Button` (disabled until file selected). Clicking -> Stern confirmation dialog ("WARNING...PERMANENTLY OVERWRITE...Are you sure?"). On confirm: Uploads to `POST /api/admin/system/restore`. Loading/progress messages. On 202 Accepted from API: `Snackbar`/message "Restore process initiated...Application might restart...log in again." UI locks down with an overlay displaying "Restore in progress. The application may restart. Please wait..." and a "Refresh Page" or "Check Status" button that enables after a short delay (e.g., 30-60s) or is always available. On API init failure: detailed error `Snackbar`.
        * `[ ]` (UX) MUI components, clear feedback, loading states. Responsive (desktop/tablet admin).

* **Story 5.4: Implement Basic System Statistics Display in Admin Dashboard**
    * **As an** Administrator,
    * **I want** an admin UI section showing simple stats (Total Users, Groups, Global URLs) via API.
    * **So that** I can quickly see app usage/scale.
    * **Acceptance Criteria:**
        * `[ ]` (Admin UI) "System Statistics" / "Dashboard Overview" section/page in admin (e.g., on `/admin` or `/admin/stats`). `ADMIN` only.
        * `[ ]` (Stats Displayed) Labels + numerical values for: "Total Registered Users", "Total URL Groups", "Total Global URLs". Clean format (MUI `Card`s or list).
        * `[ ]` (Backend API for Stats) `GET /api/admin/statistics/summary` (or similar) returns JSON `{ userCount, groupCount, urlCount }`. `ADMIN` role. Backend uses Prisma `count()`.
        * `[ ]` (Data Fetching & Display) UI calls API on load. Loading indicator (MUI `Skeleton`). Error message on fail. Stats are read-only. Optional "Refresh Stats" `Button`.
        * `[ ]` (UX) Clear, concise. Responsive (desktop/tablet admin).

* **Story 5.5: Implement Basic User Activity Tracking Log (Backend & Admin UI with structured JSON details)**
    * **As an** Administrator/System,
    * **I want** key actions logged with structured JSON details, and an Admin UI to view this paginated log (with potential basic client-side MUI table search).
    * **So that** there's a rich audit trail.
    * **Acceptance Criteria:**
        * `[ ]` (`ActivityLog` Prisma Model) Fields: `id`, `timestamp`, `userId?`, `actingUserName` (String), `userRole?`, `actionType` (String/Enum), `details (Json?)`, `targetEntityType?`, `targetEntityId?`, `isSuccess?`. `User` relation `onDelete: SetNull`. Migration. Client regen.
        * `[ ]` (Backend Logging Service) Reusable service `createActivityLogEntry(data: CreateActivityLogDto)` (with `details: Record<string, any>`). Creates `ActivityLog` via Prisma.
        * `[ ]` (Key Actions Logged - MVP Scope, with structured `details`): User Login; Admin User Management (Create, Update, Disable/Enable); Admin Branding Changes; Admin Group/URL Mgt (CRUD Groups, URLs, UrlInGroup); System Ops (Backup/Restore initiation & completion, Log Pruning); User Settings Changes (Theme/Menu). NO sensitive data.
        * `[ ]` (Admin UI for Activity Log) "/admin/activity-log" page. `ADMIN` only. MUI `Table`. Columns: Timestamp, Acting User, Action Type, Details (parsed JSON, readable format), Target, Success. Reverse chronological. Server-side pagination (25-50/page). Optional: Enable MUI table client-side search if easy for displayed data.
        * `[ ]` (Backend API for Logs) `GET /api/admin/activity-log`. `ADMIN` role. Supports pagination. Returns paginated `ActivityLog` records (`details` as JSON).
        * `[ ]` (Performance & Security) Logging efficient. No sensitive data.

* **Story 5.6: Implement Configurable Log Retention Policy for Activity Logs (Default 180 days, Manual Trigger & Pruning Log)**
    * **As an** Administrator/System,
    * **I want** to configure log retention (default 180 days, 0=forever via `SystemSetting.logRetentionDays`), have the system auto-prune old logs (via `node-cron`), log pruning to ActivityLog, and allow manual pruning trigger via UI/API.
    * **So that** I manage log storage and have control over cleanup.
    * **Acceptance Criteria:**
        * `[ ]` (`SystemSetting` Schema Enhancement) `SystemSetting` model updated/created with `logRetentionDays (Integer, @default(180))`. `0` means keep indefinitely. Migration. Default record created if none exists (e.g., single row with fixed ID "singleton").
        * `[ ]` (Admin UI for Log Retention) Section in admin page (e.g., Activity Log page or System Settings). Displays current policy. MUI `TextField` (number, min 0) or `Select` for `logRetentionDays` (options like "30d", "90d", "180d (Default)", "365d", "Keep Indefinitely (0)"). "Save Policy" `Button`. Confirmation dialog. API saves. Success/error `Snackbar`.
        * `[ ]` (Backend API for Policy) API (e.g., `PUT /api/admin/settings`) updates `logRetentionDays`. Validates non-negative int. `ADMIN` role.
        * `[ ]` (Automated Log Pruning - Scheduled Task) `node-cron` task runs periodically (e.g., daily 3 AM). Reads `logRetentionDays`. If > 0, calculates cutoff, `deleteMany` `ActivityLog` records older than cutoff. Efficient. Task logs its own execution to standard app logs. After successful pruning, task creates summary entry in `ActivityLog` table (e.g., `actionType: "SYSTEM_LOG_PRUNED"`, `actingUserName: "SYSTEM"`, `details: { entriesPruned: X, policyDays: Y }`).
        * `[ ]` (Manual Log Pruning Trigger) UI `Button` "Prune Logs Now" in Log Retention section. Confirmation dialog ("...prune according to current policy [details]?"). On confirm, calls new API `POST /api/admin/system/logs/prune-now` (`ADMIN` role). API executes pruning logic on demand (synchronous with UI loader for MVP). API response indicates success/failure/count. Manual pruning also logs to `ActivityLog`.
        * `[ ]` (Default Policy Application) Default `logRetentionDays: 180` ensures pruning if admin never configures.
