# Authentication

## Overview

### Purpose

- Provides secure user identification and access control for ControlCenter
- Enables personalized user experiences through persistent sessions
- Supports first-run setup for initial admin configuration

### User Stories

- [ ] As a user, I want to log in to access my personalized dashboard
- [ ] As a new admin, I want to set up my initial password during first run
- [ ] As a user, I want to extend my session with "Remember Me"
- [ ] As a user, I want to change my password from the settings page
- [ ] As a user, I want to manage my profile avatar

### Key Functionalities

- Credential-based Authentication
  - User identification by unique `name` with password
  - NextAuth.js implementation with JWT tokens
  - HTTP-only cookies for secure session storage
  - Password hashing with bcryptjs
  - Configurable session duration and "Remember Me"
  
- First Run Experience
  - Detection of "first run" state
  - Passwordless admin login for initial setup
  - Required admin password configuration flow
  - Option for application state restoration (disabled in MVP)

- Authorization & Access Control
  - Role-based access (ADMIN/USER)
  - Protected routes via Next.js middleware
  - Active status enforcement
  - Client-side proactive session validation

- User Profile Management
  - Password change functionality
  - Avatar upload and management
  - User preferences persistence

### Dependencies

- External Services:
  - NextAuth.js v4
  - JWT for token handling
  - bcryptjs for password hashing
  
- Internal Dependencies:
  - Prisma ORM for user data storage
  - User model with required fields
  - UserSetting model for preferences
  - Session token inclusion of user preferences

## Status

### Current State

- Implementation status: Planned for Epic 1
- Deployment status: Not deployed
- Feature flags: None

### Planned Improvements

- [ ] Public self-registration for users (post-MVP)
  - Priority: Low
  - Timeline: Post-MVP
  
- [ ] Admin ability to reset user passwords (post-MVP)
  - Priority: Low
  - Timeline: Post-MVP

### Known Limitations

- Admin cannot reset passwords for other users in MVP
- No public self-registration (admin-created users only)
- Limited password complexity requirements (minimum 4 characters)

## Quick Links

- [Architecture](./architecture.md)
- [Components](./components.md)
- [API Documentation](./api.md)
- [Testing](./testing.md)

## Change History

- 2025-05-27: Initial documentation 
