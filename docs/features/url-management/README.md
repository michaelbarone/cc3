# URL Management & IFrame Container

## Overview

This feature group handles URL organization, IFrame management, and state synchronization between URLs and their corresponding IFrames. It provides a flexible system for managing multiple URLs in groups with efficient IFrame loading and state management.

## Purpose and Goals

- Implement efficient URL group management system
- Provide seamless IFrame loading and state management
- Enable mobile/desktop URL differentiation
- Support URL-specific idle timeout cleanup
- Create intuitive URL menu interface
- Implement efficient IFrame caching

## Key Functionalities

- URL group organization
- IFrame state management (loaded/unloaded)
- Mobile/desktop URL variants
- URL-specific idle timeouts
- Menu state synchronization
- IFrame visibility control
- Long-press reset functionality
- Progress indicator for actions

## Dependencies

### Core Technologies
- Next.js App Router
- React Server Components
- Custom React hooks
- TypeScript state management
- Tailwind CSS for styling

### Development Dependencies
- @types/react
- @types/node
- tailwindcss
- typescript

## Status

### Current State
✓ URL group management system implemented
✓ IFrame container with state management complete
✓ Mobile/desktop URL support active
✓ Menu state synchronization working
✓ Long-press functionality implemented
✓ Progress indicators added

### Known Limitations
- No drag-and-drop URL reordering
- Limited cross-origin IFrame support
- No automatic URL validation
- Manual mobile URL configuration required

## Quick Links

- [Architecture Documentation](./architecture.md)
- [Component Documentation](./components.md)
- [API Documentation](./api.md)
- [Testing Documentation](./testing.md)

## Implementation History

### 2024-03-18 - URL Management System
✓ Created URL group database schema
✓ Implemented URL CRUD operations
✓ Added URL group assignments
✓ Created URL ordering system
✓ Added mobile URL support

### 2024-03-18 - IFrame Container
✓ Implemented IFrame state management
✓ Added visibility controls
✓ Created state synchronization
✓ Implemented caching system
✓ Added error boundaries

### 2024-03-18 - Menu Integration
✓ Created collapsible menu groups
✓ Added state indicators
✓ Implemented active states
✓ Added long-press handling
✓ Created progress indicators

### 2024-03-18 - State Management
✓ Implemented URL state tracking
✓ Added IFrame lifecycle management
✓ Created state persistence
✓ Added idle timeout system
✓ Implemented cleanup routines 
