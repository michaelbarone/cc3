# UI Framework

## Overview

The UI Framework provides a comprehensive foundation for building consistent, accessible, and responsive user interfaces across the application. Built on Material UI with custom theming support, it offers a robust set of components, layouts, and utilities that adhere to modern design principles.

## Purpose and Goals

1. Provide a consistent and maintainable UI component system
2. Support both light and dark themes with seamless switching
3. Ensure responsive design across all device sizes
4. Maintain accessibility standards (WCAG 2.1)
5. Enable efficient component development and reuse

## Key Functionalities

### Theme System
- Light/Dark mode support
- Custom color palette configuration
- Typography system with responsive scaling
- Component-level theme customization
- Runtime theme switching
- Theme preferences persistence
- Dedicated appearance settings page

### Layout Components
- Responsive app layout with dynamic menu positioning
- Settings layout with forced side menu
- Admin layout with navigation
- Authentication layout for login/registration

### Core Components
- AppBar with user menu and theme toggle
- Responsive drawer with mobile support
- Logo and branding components
- Form components with validation
- Dialog and modal components

### Utilities
- Theme context and hooks
- Responsive helpers
- Layout utilities
- Style constants

## Dependencies

### Core Technologies
- Material UI v5
- Next.js 14+ (App Router)
- TypeScript
- Emotion (CSS-in-JS)

### Development Dependencies
- Testing Library
- Storybook (planned)
- Theme Designer (planned)
- Component Documentation Generator (planned)

## Current Status

### Implemented Features
- [x] Theme system with light/dark modes
- [x] Responsive layout components
- [x] Core UI components
- [x] User preference persistence
- [x] Mobile-first design approach
- [x] Accessibility support
- [x] Custom hooks and utilities
- [x] Dedicated appearance settings page
- [x] Theme picker in user settings

### Known Limitations
- Theme customization limited to runtime
- No component documentation site yet
- Limited animation support
- No design token system
- Component variants need standardization

## Quick Links

- [Architecture Documentation](./architecture.md)
- [Component Documentation](./components.md)
- [API Documentation](./api.md)
- [Testing Documentation](./testing.md)

## Implementation History

### Phase 1: Core Setup (March 2024)
- Implemented Material UI integration
- Created base theme configuration
- Set up layout components
- Added responsive design support

### Phase 2: Theme System (March 2024)
- Added theme provider
- Implemented light/dark modes
- Created theme switching
- Added user preference sync

### Phase 3: Component Library (March 2024)
- Created core components
- Added form components
- Implemented dialogs
- Added loading states

### Phase 4: Polish & Optimization (March 2024)
- Enhanced accessibility
- Improved performance
- Added error boundaries
- Enhanced mobile support 

### Phase 5: Theme Management Improvements (March 2024)
- Relocated theme picker from header to user settings
- Created dedicated appearance settings page
- Added visual theme mode selection
- Improved theme persistence 
