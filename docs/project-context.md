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
- Development:
  - ESLint v9 with TypeScript support
  - Prettier for code formatting
  - Husky for git hooks
  - Conventional Commits with commitlint
  - Docker for containerization

## Application Directory Structure

```
/app/                  # Next.js App Router root
├── admin/             # Admin area pages and components
├── api/               # API routes for data access
├── components/        # Shared UI components
├── contexts/          # React contexts for state sharing
├── dashboard/         # Main dashboard pages
├── lib/               # App-specific utilities
├── login/             # Authentication pages
├── providers/         # App providers (authentication, theme)
├── settings/          # User settings pages
├── setup/             # Initial app setup pages
├── theme/             # Theme configuration
├── types/             # TypeScript type definitions
├── layout.tsx         # Root layout component
├── page.tsx           # Root page component
└── globals.css        # Global CSS styles

/lib/                  # Project-level utilities
├── db/                # Database utilities and services
└── archive.ts         # Archive utilities for backup/restore

/prisma/               # Prisma ORM schema and migrations
├── migrations/        # Database migration files
└── schema.prisma      # Database schema definition

/scripts/              # Build and utility scripts
├── cleanup-dev.ts     # Development cleanup utilities
├── seed-test-data.ts  # Test data seeding script
└── test-url-creation.ts  # URL testing utilities

/public/               # Static assets

/data/                 # Data storage directory

/__tests__/            # Test directory
```

## Project Best Practices

1. Use TypeScript for type safety
2. Use Material UI exclusively
3. Use functional components with hooks
4. Add clear comments
5. Follow the above project structure or current project version of Next.js structure when expanding
6. Use environment variables
7. Optimize performance
8. Ensure accessibility
9. Let TypeScript infer types when possible
10. All components should be in app/components
