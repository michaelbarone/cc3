# Project Plan

*Last updated: 2025-06-22 20:36*

This document serves as the main project plan and tracks the status of all tasks related to the project.

## Active Tasks

### Iframe UX - url option to link out to new tab
- **Location**: `/docs/working-memory/open/iframe-link-out-20250701`
- **Description**: Add URL config option to link out to new tab. This should be a toggle on the URL config page. If the toggle is on, the URL will be opened in a new tab. If the toggle is off, the URL will be opened in the iframe. This is for known URLs that have issues in iframes but we still want to be able to use them.
- **Priority**: High
- **Estimated Effort**: 1 week

## Future Tasks

### Iframe UX - user registration
- **Description**: check if user registration is working as expected.  if so, add option to specify default groups for new users.
- **Priority**: High
- **Estimated Effort**: 1 week

### Iframe UX - no scroll bars on iframe or iframe container
- **Description**: Remove scroll bars from iframe and iframe container
- **Priority**: High
- **Estimated Effort**: 1 week

### Docker Backup/Restore Validation
- **Description**: Validate backup and restore functionality with Docker deployment after image storage and database path adjustments
- **Key Milestones**:
  - Test backup creation in Docker environment
  - Verify backup file structure and integrity
  - Test restore functionality with Docker volumes
  - Validate image storage path handling during restore
  - Ensure database paths are correctly managed
  - Update documentation for Docker-specific backup/restore procedures
  - Create automated test for backup/restore in Docker environment
- **Priority**: High
- **Estimated Effort**: 1 week

### Database Version Migration Support
- **Description**: Add support for database version migrations with minimal downtime
- **Priority**: Medium
- **Estimated Effort**: 3 weeks

### Performance Optimization
- **Description**: Optimize application performance across frontend and backend
- **Priority**: Medium
- **Estimated Effort**: 2 weeks

### Security and Monitoring
- **Description**: Enhance security measures and add robust monitoring
- **Priority**: High
- **Estimated Effort**: 2 weeks

### User Features
- **Description**: Add new user-requested features
- **Priority**: Low
- **Estimated Effort**: 4 weeks

### Application Logo Enhancement
- **Description**: Enhance application logo upload process to generate Apple-format images for app loading screens
- **Key Milestones**:
  - Update logo upload functionality to process original image
  - Implement image processing for Apple app loading screen formats
  - Generate various sizes required for different Apple devices
  - Add validation for minimum image quality/resolution
  - Update admin UI to show preview of generated images
  - Update documentation for logo requirements
- **Priority**: Medium
- **Estimated Effort**: 1 week

### Backup Manifest Implementation
- **Description**: Enhance backup functionality to include a manifest file with metadata
- **Key Milestones**:
  - Create manifest JSON structure with timestamp, schema version, and app version
  - Update backup creation process to include manifest
  - Update restore process to validate manifest
  - Add manifest validation in the UI
  - Update backup/restore documentation
- **Priority**: Medium
- **Estimated Effort**: 1 week

### User Activity Logging System
- **Description**: Implement comprehensive user activity logging system
- **Key Milestones**:
  - Create ActivityLog database model
  - Implement logging service
  - Add activity tracking for key actions (login, admin changes, system operations)
  - Create admin UI for viewing activity logs
  - Implement log retention policy and pruning
  - Add manual log pruning capability
- **Priority**: Medium
- **Estimated Effort**: 2 weeks

## Closed Tasks

### login page locked user improvement flow
- **Description**: When a locked user is selected on the login page, we should select/highlight the password field for easy entry of password.  Other UX enhancements including tile focus and keyboard navigation testing.
- **Priority**: Medium
- **Estimated Effort**: 1 week

### Admin URL Management Improvements
- **Location**: `/docs/working-memory/done/admin-url-management-20250614`
- **Completion Date**: `2025-06-14`
- **Description**: Enhanced URL management in the admin area with improved UX and functionality
- **Key Achievements**:
  - Fixed dialog to clear inputs when adding a new URL
  - Added "Save and Add Another" button for efficient URL creation
  - Set default timeout to 0 seconds (disabled by default)
  - Added tooltip indicating timeout functionality is not yet configured
  - Added URL group management directly from the URLs admin page
  - Fixed issues with form state management during URL creation

### IFrame Container Refactor
- **Location**: `/docs/working-memory/done/iframe-container-refactor`
- **Completion Date**: `2025-03-18`
- **Description**: Comprehensive refactor of the IFrame container system for improved performance and resource management
- **Key Achievements**:
  - Created robust state management with TypeScript types and interfaces
  - Implemented global container approach with direct DOM manipulation for performance
  - Developed modular hook system for iframe lifecycle management
  - Added support for mobile/desktop URLs and cross-origin handling
  - Implemented URL-specific idle timeout system
  - Built flexible component architecture with proper error boundaries
  - Integrated menu system with state synchronization
  - Fixed menu format issues and iframe visibility problems

### Menu State Management
- **Location**: `/docs/working-memory/done/url-menu-state-management`
- **Completion Date**: `2025-04-05`
- **Description**: Implemented four specific states for URL menu items with comprehensive state management
- **Key Achievements**:
  - Implemented state management system with proper transitions
  - Added visual indicators for loading states (green dot)
  - Implemented long press functionality with visual feedback
  - Created comprehensive edge case tests for all interaction patterns
  - Added detailed documentation with state transition diagrams
  - Optimized performance with memoization techniques
  - Integrated haptic feedback for mobile devices

### Library and Test Directory Refactoring
- **Location**: `/docs/working-memory/done/lib-test-refactor-20240405`
- **Completion Date**: `2025-05-08`
- **Description**: Reorganized library and test directories to improve maintainability and follow better practices
- **Key Achievements**:
  - Consolidated test helpers and utilities into proper directory structure
  - Improved debug utilities with better type safety and documentation
  - Created dedicated directories for fixtures, mocks, and helpers
  - Consolidated file system mock and cleanup utilities
  - Reorganized library code structure for better maintainability
  - Improved types and interfaces for mock data
  - Fixed TypeScript errors in test utilities
  - Completed E2E test migration
  - Verified all tests pass with updated structure
  - Documented new structure for team reference

### API Test Standards Review
- **Location**: `/docs/working-memory/done/api-test-review-20250405`
- **Completion Date**: `2025-05-08`
- **Description**: Comprehensive review of all API tests to ensure compliance with testing standards
- **Key Achievements**:
  - Reviewed and updated all API test files to meet standards
  - Improved error handling with try/catch/finally blocks and debugError utility
  - Added consistent performance monitoring with measureTestTime
  - Enhanced type safety with proper response type assertions
  - Updated test data management with factory functions
  - Verified all tests pass with proper mock implementation
  - Updated testing documentation with examples from improvements
  - Achieved 100% route and HTTP method coverage
  - Standardized test patterns across all API tests

### URL Group Management Refactor
- **Location**: `/docs/working-memory/done/url-group-management-refactor-20250326`
- **Completion Date**: `2025-04-05`
- **Description**: Refactored URL group management to allow URLs to belong to multiple groups with independent display orders
- **Key Achievements**:
  - Created new database schema with join table for URLs and groups
  - Implemented display order at group level, not URL level
  - Added batch operations for URL group management
  - Implemented proper reordering functionality
  - Optimized performance with appropriate indexes
  - Added comprehensive testing for all operations
  - Validated URL reordering in production environment

### Theme Picker Relocation
- **Location**: `/docs/working-memory/done/theme-picker`
- **Completion Date**: `2025-03-15`
- **Description**: Relocated theme picker to settings panel and added new themes
- **Key Achievements**:
  - Moved theme picker to settings panel
  - Added 5 new themes
  - Implemented theme persistence
  - Added theme preview functionality

### API Test Coverage Improvement
- **Location**: `/docs/working-memory/done/api-test-coverage`
- **Completion Date**: `2025-03-10`
- **Description**: Improved API test coverage and reliability
- **Key Achievements**:
  - Increased coverage from 65% to 92%
  - Added endpoint validation tests
  - Implemented error case testing
  - Added performance benchmarks

### Login Page UI Updates
- **Location**: `/docs/working-memory/done/login-ui-update-20250319`
- **Completion Date**: 2025-04-05
- **Description**: Enhanced login page with modern design, improved UX, and better accessibility
- **Key Achievements**:
  - Implemented modern visual design with subtle animations
  - Enhanced responsive design for all device sizes
  - Added proper keyboard navigation across user tiles
  - Implemented comprehensive WCAG 2.1 compliance
  - Added focus management and screen reader compatibility
  - Optimized performance with memoization techniques
  - Implemented loading state with smooth transitions
  - Prevented UI flashing during initial load
  - Created first run experience with backup restore functionality
  - Added component cleanup to prevent memory leaks
  - Updated documentation for auth components

### Menu Position Initialization
- **Location**: `/docs/working-memory/done/menu-position-init-20240322`
- **Completion Date**: 2024-03-22
- **Description**: Modified menu position initialization to start as undefined
- **Key Achievements**:
  - Updated preferences state to initialize menuPosition as undefined
  - Modified MenuBarAdapter to not render when menuPosition is undefined
  - Improved UX by preventing premature menu rendering
  - Maintained type safety throughout the changes

### Admin Configuration
- **Location**: `/docs/working-memory/done/admin-configuration`
- **Completion Date**: 2024-03-18
- **Description**: Comprehensive admin area with user management, URL groups, and application settings
- **Key Achievements**:
  - Built user management with password optional toggle
  - Created URL group management with ordering capabilities
  - Implemented application configuration with favicon upload

### User Settings
- **Location**: `/docs/working-memory/done/user-settings`
- **Completion Date**: 2024-03-18
- **Description**: User profile and settings management functionality
- **Key Achievements**:
  - Created user dropdown with profile and settings access
  - Implemented password management and avatar upload
  - Added menu bar position preference setting

### Login Page
- **Location**: `/docs/working-memory/done/login-page`

### Password Complexity Requirements

**Location**: `/docs/working-memory/done/password-complexity-20250622/`  
**Completion Date**: 2025-06-22  
**Description**: Added configurable password complexity requirements to the admin area and integrated password validation throughout the application.

**Key Achievements**:
- Added password complexity fields to the AppConfig model
- Created a centralized password validation utility
- Added UI for configuring password requirements in the admin area
- Updated registration and password change flows to validate against requirements
- Ensured only new passwords are validated, not existing ones
- Updated documentation for the password complexity feature
