# ControlCenter Features

This directory contains documentation for the core features of the ControlCenter application, as defined in the [Product Requirements Document](../prd.md).

## Feature Overview

| Feature | Description | Epic |
|---------|-------------|------|
| [Authentication](./authentication/README.md) | User identification, access control, and profile management | Epic 1 |
| [Admin Dashboard](./admin-dashboard/README.md) | Administration interface for system management | Epics 2 & 5 |
| [URL Management](./url-management/README.md) | Organization and management of URLs and groups | Epic 3 |
| [Iframe Interaction](./iframe-interaction/README.md) | Display and interaction with external websites | Epic 4 |
| [User Personalization](./user-personalization/README.md) | User preferences and customization options | Epic 4 |
| [System Operations](./system-operations/README.md) | Backup, restore, logging, and monitoring | Epic 5 |

## Feature Documentation Structure

Each feature directory contains the following documentation:

- **README.md**: Overview, purpose, user stories, key functionalities, dependencies, status, and change history
- **architecture.md**: System design, technical decisions, dependencies, security considerations, and future plans
- **components.md**: Component hierarchy, props interfaces, usage examples, and optimization strategies
- **api.md**: API endpoints, request/response formats, error handling, and testing information
- **testing.md**: Test strategies, test cases, mock data, and debugging guidelines

## Implementation Status

The ControlCenter application is currently in the planning phase, with implementation to follow based on the defined epics:

1. **Epic 1**: Foundational Setup & Core User Authentication
2. **Epic 2**: Admin Dashboard - Core Administration & Multi-User Setup
3. **Epic 3**: Core URL & Group Management with Basic Iframe Display
4. **Epic 4**: Advanced Iframe Interaction & User Personalization
5. **Epic 5**: Admin Dashboard - System Operations & Monitoring

## Technology Stack

- **Frontend**: Next.js 15.2.2 (App Router), React 19, TypeScript 5, Material UI v6, Emotion
- **Backend**: Next.js API Routes, Prisma ORM v6.5.0, NextAuth.js v4, JWT, Zod
- **Database**: SQLite with Prisma ORM
- **Testing**: Vitest, RTL, MSW, Happy DOM, Playwright
- **Dev Tooling**: ESLint, Prettier, Husky, Conventional Commits, Docker
- **Utilities**: formidable (uploads), archiver/unzipper (zip), node-cron (scheduling)

## Related Documentation

- [Product Requirements Document](../prd.md): Comprehensive project requirements
- [Epic 1: Authentication](../epic1.md): Detailed user stories for authentication
- [Epic 2: Admin Dashboard Core](../epic2.md): Detailed user stories for admin dashboard
- [Epic 3: URL Management](../epic3.md): Detailed user stories for URL management
- [Epic 4: Iframe Interaction](../epic4.md): Detailed user stories for iframe interaction
- [Epic 5: System Operations](../epic5.md): Detailed user stories for system operations 
