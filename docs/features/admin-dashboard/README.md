# Admin Dashboard

## Overview

### Purpose

- Provides a centralized interface for system administration tasks
- Enables management of users, URLs, groups, and system settings
- Offers monitoring and maintenance capabilities for system operators
- Supports application customization and branding

### User Stories

- [ ] As an admin, I want to manage user accounts (create, edit, disable)
- [ ] As an admin, I want to customize application branding (name, logo, favicon)
- [ ] As an admin, I want to configure system settings like user registration and log retention
- [ ] As an admin, I want to back up and restore the application state
- [ ] As an admin, I want to monitor system activity through logs
- [ ] As an admin, I want to view system statistics and health information

### Key Functionalities

- User Management
  - Create new users with roles (ADMIN/USER)
  - Edit user login names and roles
  - Enable/disable user accounts
  - Safeguards against removing the last admin
  
- URL and Group Management
  - Admin interfaces for URL and group CRUD operations
  - URL-to-group assignment and ordering
  - Group-specific URL title customization
  - Favicon management for URLs
  
- Application Configuration
  - Branding customization (app name, logo, favicon)
  - System settings management
  - User registration control
  - Log retention policy configuration
  
- System Operations
  - Backup creation (.zip with DB, assets, manifest)
  - Backup file management (list, download, delete)
  - System state restoration from backup
  - Database migration handling during restore
  
- Monitoring and Reporting
  - System statistics display
  - Activity log tracking and viewing
  - Automated log pruning based on retention policy
  - Manual log pruning capability

### Dependencies

- External Services:
  - None directly
  
- Internal Dependencies:
  - Authentication system for admin access control
  - Prisma ORM for database operations
  - File system access for backups and uploads
  - URL Management system for URL and group operations

## Status

### Current State

- Implementation status: Planned for Epics 2 and 5
- Deployment status: Not deployed
- Feature flags: None

### Planned Improvements

- [ ] Advanced admin list filtering/sorting (post-MVP)
  - Priority: Medium
  - Timeline: Post-MVP
  
- [ ] Detailed audit log pruning feedback in admin UI (post-MVP)
  - Priority: Low
  - Timeline: Post-MVP
  
- [ ] Admin ability to reset user passwords (post-MVP)
  - Priority: Medium
  - Timeline: Post-MVP

### Known Limitations

- Basic sorting/pagination for admin tables in MVP
- Limited async feedback for backup/restore operations
- Admin cannot manage avatars for other users in MVP
- Admin cannot reset passwords for other users in MVP

## Quick Links

- [Architecture](./architecture.md)
- [Components](./components.md)
- [API Documentation](./api.md)
- [Testing](./testing.md)

## Change History

- 2025-05-27: Initial documentation 
