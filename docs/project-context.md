# Project Context

## Tech Stack

- Frontend:
  - Next.js 15.2.2 with App Router
  - React 19
  - TypeScript 5
  - Material UI (MUI) v6
  - Emotion for styling
- Backend:
  - Prisma ORM v6.5.0
  - NextAuth.js v4 for authentication
  - JWT for token management
- State Management:
  - React Context/Hooks
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
/app/                  # Next.js App Router root
├── admin/             # Admin area pages and components (users, url-groups, global-urls, etc.)
├── api/               # API routes for data access (auth, admin, user, dashboard, etc.)
├── components/        # Shared UI components (UserTile, IframeWrapper, etc.)
│   ├── admin/         # Admin-specific components
│   ├── layout/        # Layout components
│   ├── ui/            # UI components
│   └── url-menu/      # URL menu components
├── dashboard/         # Main dashboard pages
├── lib/               # App-specific utilities and services
│   ├── archive/       # Archive utilities for backup/restore
│   ├── auth/          # Authentication utilities
│   ├── db/            # Database utilities
│   ├── hooks/         # Custom React hooks
│   ├── state/         # State management
│   ├── utils/         # Utility functions
│   └── settings/      # Settings utilities
├── login/             # Authentication pages
├── providers/         # App providers (authentication, theme)
├── settings/          # User settings pages
│   ├── appearance/    # Theme settings
│   ├── password/      # Password management
│   └── profile/       # Profile settings
├── theme/             # Theme configuration
├── types/             # TypeScript type definitions
├── layout.tsx         # Root layout component
├── page.tsx           # Root page component
└── globals.css        # Global CSS styles

/prisma/               # Prisma ORM schema and migrations
├── migrations/        # Database migration files
├── data/              # Prisma data files
└── schema.prisma      # Database schema definition

/public/               # Static assets
├── avatars/           # User uploaded avatars
├── favicons/          # Favicon files
├── icons/             # Icon files
├── logos/             # Logo files
└── uploads/           # General uploaded files

/data/                 # Data storage directory
├── backups/           # Backup archives

/test/                 # Test directory
├── e2e/               # End-to-end tests with Playwright
│   ├── helpers/       # E2E test helpers
│   └── journeys/      # E2E test journeys
├── fixtures/          # Test fixtures
│   └── data/          # Test data
├── helpers/           # Test helpers
├── integration/       # Integration tests
├── mocks/             # Test mocks
│   ├── factories/     # Factory functions for test data
│   └── services/      # Service mocks
└── setup/             # Test setup files

/docs/                 # Project documentation
├── features/          # Feature documentation
│   ├── admin-features/           # Admin features documentation
│   ├── auth-user-management/     # Authentication and user management
│   ├── core-infrastructure/      # Core infrastructure documentation
│   ├── iframe-state/             # Iframe state management
│   ├── testing-framework/        # Testing framework documentation
│   ├── ui-framework/             # UI framework documentation
│   ├── url-management/           # URL management documentation
│   └── user-settings/            # User settings documentation
├── templates/         # Documentation templates
├── working-memory/    # Project planning and memory
│   ├── done/          # Completed tasks
│   ├── open/          # Active tasks
│   └── plan.md        # Main project plan
└── project-context.md # This file
```

## Project Best Practices

1. **TypeScript and Type Safety**
   - Use TypeScript for type safety
   - Define interfaces for all data structures
   - Use proper typing for API responses and requests
   - Let TypeScript infer types when possible

2. **UI Development**
   - Use Material UI (MUI) v6 exclusively for UI components
   - Use functional components with hooks
   - Follow accessibility standards
   - Implement responsive designs for all components

3. **Code Organization**
   - Place all components in `app/components`
   - Keep utilities and services in `app/lib`
   - Use Next.js App Router conventions
   - Maintain a clean separation of concerns

4. **State Management**
   - Use React Context and hooks for state management
   - Create custom hooks for shared logic
   - Maintain clear state update patterns
   - Optimize re-renders with memoization

5. **API Development**
   - Implement consistent error handling
   - Use proper HTTP status codes
   - Validate inputs with Zod
   - Follow RESTful conventions

6. **Testing**
   - Write unit tests for utilities and hooks
   - Create integration tests for API routes
   - Implement E2E tests for critical user journeys
   - Monitor test performance

7. **Documentation**
   - Reference the feature documentation in `/docs/features`
   - Keep documentation up-to-date with code changes
   - Document API endpoints
   - Include examples in documentation

8. **Performance**
   - Optimize bundle size
   - Implement code splitting
   - Use proper caching strategies
   - Monitor and optimize rendering performance

9. **Security**
   - Validate all user inputs
   - Implement proper authentication and authorization
   - Use HTTP-only cookies for authentication
   - Follow security best practices

10. **Environment Configuration**
    - Use environment variables for configuration
    - Provide sensible defaults
    - Document required environment variables
    - Validate environment configuration on startup

## Feature Documentation

For detailed information about specific features, refer to the documentation in `/docs/features/`:

- [Admin Features](../features/admin-features/README.md)
- [Authentication & User Management](../features/auth-user-management/README.md)
- [Core Infrastructure](../features/core-infrastructure/README.md)
- [Iframe State Management](../features/iframe-state/README.md)
- [Testing Framework](../features/testing-framework/README.md)
- [UI Framework](../features/ui-framework/README.md)
- [URL Management](../features/url-management/README.md)
- [User Settings](../features/user-settings/README.md)
