# Project Context

## Tech Stack

- Frontend:
  - Next.js 15.2.2 with App Router
  - React 19
  - TypeScript 5
  - Material UI (MUI) v6
  - Emotion for styling
- Backend:
  - Next.js API Routes
  - Prisma ORM v6.5.0
  - NextAuth.js v4 for authentication
  - JWT for token management
  - SQLite database
  - Zod for validation
  - bcryptjs for password hashing
  - formidable for file uploads
  - archiver/unzipper for backup/restore operations
  - node-cron for scheduled tasks
- State Management:
  - React Context/Hooks (IframeProvider, UserPreferencesProvider, ThemeProvider)
- Testing:
  - Vitest with React Testing Library
  - MSW for API mocking
  - Happy DOM for testing environment
  - Playwright for E2E testing
- Development:
  - ESLint v9 with TypeScript support
  - Prettier for code formatting
  - Husky for git hooks
  - Conventional Commits with commitlint
  - Docker for containerization

## Application Directory Structure

```
/app/               # Next.js App Router root
├── admin/            # Admin area pages and components (users, url-groups, global-urls, branding, etc.)
├── api/              # API routes (auth, admin/*, user/*, dashboard/*, first-run/*)
├── components/       # Shared UI components (UserTile, IframeWrapper, AdminPageLayout, etc.)
├── contexts/         # React contexts (IframeProvider, ThemeProvider, UserPreferencesProvider)
├── dashboard/        # Main dashboard page
├── lib/              # App-specific client-side utilities (hooks, shared utils)
├── login/            # Authentication pages
├── providers/        # Root app providers wrapper component
├── settings/         # User settings pages (profile, etc.)
├── first-run/        # Pages for first-run flow (set-admin-password)
├── theme/            # Theme configuration (MUI theme objects, custom theme tokens)
├── types/            # TypeScript type definitions (global types, API response types, Zod schemas)
├── layout.tsx        # Root layout component (hosts global providers, conditional AppBar/SidePanel)
├── page.tsx          # Root page component (redirect to login or dashboard)
└── globals.css       # Global CSS styles

/lib/                 # Project-level server-side or shared utilities
├── db/               # Prisma client instance, seeding scripts
├── services/         # Backend services (authService, userService, groupService, urlService, etc.)
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

## Project Best Practices

1. Use TypeScript for type safety throughout the application
2. Use Material UI v6 components exclusively for UI
3. Use functional components with hooks for all React components
4. Add clear comments for complex logic and component props
5. Follow the established project structure when adding new features
6. Use environment variables for configuration (session duration, database path, etc.)
7. Optimize performance (memoization, efficient component updates)
8. Ensure basic accessibility (semantic HTML, color contrast, keyboard navigation)
9. Let TypeScript infer types when possible
10. All components should be in app/components

## Database Models

### Core Models
- **User**: Authentication, role-based access (ADMIN/USER), active status tracking
- **UserSetting**: User preferences for theme and menu position
- **Url**: Global URL definitions with titles and optional favicons
- **Group**: Collections of URLs with optional display order
- **UrlInGroup**: Join table with group-specific titles and display order
- **UserGroupAccess**: User permissions for URL groups
- **ActivityLog**: Tracking of system actions with structured JSON details
- **SystemSetting**: Application-wide configuration settings

## Key Features

1. **Authentication & Authorization**:
   - Role-based access control (ADMIN/USER roles)
   - Session management with configurable duration
   - "Remember Me" functionality for extended sessions
   - First-run experience for admin setup

2. **User Interface**:
   - Responsive design for desktop, tablet, and mobile
   - Customizable menu position (Top or Side)
   - Light/Dark/System theme options
   - Tile-based login interface

3. **URL Management**:
   - Iframe-based URL display with state preservation
   - URL grouping and organization
   - Click to activate/reload, long-press to unload
   - Visual indicators for URL states (loaded/unloaded/active)

4. **Admin Features**:
   - User management (create, edit, enable/disable)
   - URL and group administration
   - Application branding customization
   - System backup and restore
   - Activity logging and retention policy

## Environment Variables

- `NEXTAUTH_SECRET`: Secret for JWT tokens
- `NEXTAUTH_SESSION_MAX_AGE_SECONDS`: Default session duration (1 week)
- `NEXTAUTH_REMEMBER_ME_MAX_AGE_SECONDS`: Extended session duration
- `DATABASE_URL`: SQLite database path

## Deployment Environment

- Docker container on local home server
- Continuous Node.js process (for node-cron scheduled tasks)
- Uses .env files for environment configuration
