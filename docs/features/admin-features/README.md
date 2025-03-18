# Application Configuration & Admin Dashboard

## Overview

This feature group handles application-wide configuration, appearance settings, user preferences, and administrative functions. It provides a comprehensive admin dashboard for managing the application and monitoring system statistics.

## Purpose and Goals

- Provide centralized application configuration management
- Enable customization of application appearance and behavior
- Offer user preference management and statistics
- Support database backup and restoration
- Present system statistics and monitoring
- Facilitate administrative tasks

## Key Functionalities

- Application branding management (name, logo, favicon)
- Theme configuration (light/dark mode)
- User registration control
- Database backup and restore
- User preference tracking
- System statistics monitoring
- Admin dashboard views
- User activity tracking

## Dependencies

### Core Technologies
- Next.js App Router
- Material UI components
- SQLite with Prisma
- React Context API
- TypeScript state management

### Development Dependencies
- @mui/material
- @mui/icons-material
- @prisma/client
- react-dropzone
- chart.js

## Status

### Current State
✓ App configuration system implemented
✓ Theme management operational
✓ User preferences tracking active
✓ Database management functional
✓ Admin dashboard complete
✓ Statistics monitoring active

### Known Limitations
- No real-time statistics updates
- Limited data visualization options
- Manual backup rotation
- Basic activity logging
- No automated health checks

## Quick Links

- [Architecture Documentation](./architecture.md)
- [Component Documentation](./components.md)
- [API Documentation](./api.md)
- [Testing Documentation](./testing.md)

## Implementation History

### 2024-03-18 - Application Configuration
✓ Created app configuration system
✓ Implemented branding management
✓ Added theme configuration
✓ Set up registration control
✓ Implemented file upload handling

### 2024-03-18 - User Preferences
✓ Created preference management system
✓ Implemented theme selection
✓ Added menu position options
✓ Created preference tracking
✓ Added statistics collection

### 2024-03-18 - Database Management
✓ Implemented backup functionality
✓ Added restore capabilities
✓ Created backup rotation
✓ Added error handling
✓ Implemented progress tracking

### 2024-03-18 - Admin Dashboard
✓ Created statistics overview
✓ Implemented user monitoring
✓ Added URL statistics
✓ Created activity tracking
✓ Added preference distribution views 
