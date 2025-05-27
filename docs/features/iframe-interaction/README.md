# Iframe Interaction

## Overview

### Purpose

- Provides the core display mechanism for viewing external URLs within ControlCenter
- Enables users to manage the state of loaded web content (load, unload, reload)
- Maintains the state of multiple website sessions simultaneously
- Optimizes resource usage through intelligent iframe management

### User Stories

- [ ] As a user, I want to view external websites within the application to avoid switching between tabs
- [ ] As a user, I want to switch quickly between different websites while preserving their state
- [ ] As a user, I want to unload website content when not in use to conserve resources
- [ ] As a user, I want visual indicators showing which URLs are loaded and active
- [ ] As a user, I want to reload a website's content when needed

### Key Functionalities

- Multi-Iframe Management
  - One iframe per unique URL, kept mounted in DOM
  - CSS visibility control for active/inactive states
  - State preservation when switching between URLs
  - Optimized React Context implementation for iframe state
  
- Iframe Interaction Controls
  - Single-click activation (load/make visible/reload)
  - Long-press (2 seconds) for unloading content
  - Visual progress indicator during long-press
  - Haptic feedback on mobile for long-press actions
  
- Visual State Indicators
  - Opacity levels indicate loaded/unloaded state
  - Active URL highlighting with blue underline or border
  - "Content Unloaded" message with reload button
  - URL menu item appearance changes based on state
  
- Resource Management
  - Controlled iframe loading using src/data-src pattern
  - Sandbox attributes for security
  - Preservation of inactive iframes' state
  - Optimized memory usage through visibility control

### Dependencies

- External Services:
  - None directly, but loads external websites in iframes
  
- Internal Dependencies:
  - URL Management system for URL data
  - User Settings for menu positioning preferences
  - React Context API for state management

## Status

### Current State

- Implementation status: Planned for Epic 4
- Deployment status: Not deployed
- Feature flags: None

### Planned Improvements

- [ ] Advanced iframe resource management (post-MVP)
  - Priority: Medium
  - Timeline: Post-MVP
  - Description: LRU cache for completely removing old/unused iframe elements from DOM
  
- [ ] Live content refresh options (post-MVP)
  - Priority: Low
  - Timeline: Post-MVP

### Known Limitations

- Some websites block iframe embedding via X-Frame-Options
- Memory usage increases with number of iframes (mitigated by unload functionality)
- No automatic unloading of old/unused iframes in MVP
- No specialized handling for iframe communication/messaging

## Quick Links

- [Architecture](./architecture.md)
- [Components](./components.md)
- [API Documentation](./api.md)
- [Testing](./testing.md)

## Change History

- 2025-05-27: Initial documentation 
