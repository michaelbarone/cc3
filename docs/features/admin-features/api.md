# Application Configuration & Admin Dashboard API

## API Overview

This document details the API endpoints for application configuration, user preferences, and administrative functions.

## Configuration Endpoints

### GET /api/admin/app-config

Retrieves the current application configuration.

```typescript
// Response Type
interface AppConfigResponse {
  id: string;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### PATCH /api/admin/app-config

Updates the application name.

```typescript
// Request Type
interface UpdateAppNameRequest {
  appName: string;
}

// Response Type
interface UpdateAppNameResponse {
  success: boolean;
  config?: AppConfigResponse;
  error?: string;
}
```

### PATCH /api/admin/app-config/theme

Updates the login page theme.

```typescript
// Request Type
interface UpdateLoginThemeRequest {
  loginTheme: 'light' | 'dark';
}

// Response Type
interface UpdateLoginThemeResponse {
  success: boolean;
  config?: AppConfigResponse;
  error?: string;
}
```

### PATCH /api/admin/app-config/registration

Updates user registration settings.

```typescript
// Request Type
interface UpdateRegistrationRequest {
  registrationEnabled: boolean;
}

// Response Type
interface UpdateRegistrationResponse {
  success: boolean;
  config?: AppConfigResponse;
  error?: string;
}
```

### GET /api/admin/app-config/password-policy

Retrieves the current password complexity requirements.

```typescript
// Response Type
interface PasswordPolicyResponse {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}
```

### PATCH /api/admin/app-config/password-policy

Updates password complexity requirements.

```typescript
// Request Type
interface UpdatePasswordPolicyRequest {
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

// Response Type
interface UpdatePasswordPolicyResponse {
  id: string;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  // Other AppConfig fields
}
```

## Asset Management Endpoints

### POST /api/admin/app-config/logo

Uploads an application logo.

```typescript
// Request Type
// Multipart form data with 'logo' file field

// Response Type
interface LogoUploadResponse {
  success: boolean;
  logo_path?: string;
  error?: string;
}
```

### DELETE /api/admin/app-config/logo

Removes the application logo.

```typescript
// Response Type
interface LogoDeleteResponse {
  success: boolean;
  error?: string;
}
```

### POST /api/admin/app-config/favicon

Uploads a browser favicon.

```typescript
// Request Type
// Multipart form data with 'favicon' file field

// Response Type
interface FaviconUploadResponse {
  success: boolean;
  favicon_path?: string;
  error?: string;
}
```

### DELETE /api/admin/app-config/favicon

Removes the browser favicon.

```typescript
// Response Type
interface FaviconDeleteResponse {
  success: boolean;
  error?: string;
}
```

## Database Management Endpoints

### POST /api/admin/database/backup

Creates a database backup.

```typescript
// Response Type
interface BackupResponse {
  success: boolean;
  backup_path?: string;
  timestamp?: string;
  error?: string;
}
```

### POST /api/admin/database/restore

Restores from a database backup.

```typescript
// Request Type
// Multipart form data with 'backup' file field

// Response Type
interface RestoreResponse {
  success: boolean;
  timestamp?: string;
  error?: string;
}
```

### GET /api/admin/database/backups

Lists available database backups.

```typescript
// Response Type
interface BackupListResponse {
  backups: Array<{
    filename: string;
    size: number;
    created_at: string;
  }>;
}
```

## Statistics Endpoints

### GET /api/admin/statistics

Retrieves system statistics.

```typescript
// Response Type
interface SystemStatisticsResponse {
  users: {
    total: number;
    active: number;
    admins: number;
  };
  urls: {
    total: number;
    withMobileVersion: number;
    desktopOnly: number;
    orphaned: number;
  };
  userPreferences: {
    themeDistribution: Record<string, number>;
    menuPositionDistribution: Record<string, number>;
  };
  activity: {
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
}
```

### GET /api/admin/statistics/activity

Retrieves detailed activity statistics.

```typescript
// Query Parameters
interface ActivityQuery {
  start_date?: string;
  end_date?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

// Response Type
interface ActivityStatisticsResponse {
  data: Array<{
    timestamp: string;
    active_users: number;
    url_loads: number;
    errors: number;
  }>;
}
```

## User Preferences Endpoints

### GET /api/users/[id]/preferences

Retrieves user preferences.

```typescript
// Response Type
interface UserPreferencesResponse {
  userId: string;
  themeMode: 'light' | 'dark';
  menuPosition: 'side' | 'top';
  lastActiveUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### PATCH /api/users/[id]/preferences

Updates user preferences.

```typescript
// Request Type
interface UpdatePreferencesRequest {
  themeMode?: 'light' | 'dark';
  menuPosition?: 'side' | 'top';
  lastActiveUrl?: string | null;
}

// Response Type
interface UpdatePreferencesResponse {
  success: boolean;
  preferences?: UserPreferencesResponse;
  error?: string;
}
```

## User Management Endpoints

### POST /api/admin/users/[id]/avatar

Uploads an avatar for a specific user.

```typescript
// Request Type
// Multipart form data with 'avatar' file field

// Response Type
interface AvatarUploadResponse {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}
```

Key Features:
- Maximum file size: 2MB
- Supported formats: Image files only
- Automatic WebP conversion
- Image optimization (250x250px)
- Old avatar cleanup

### DELETE /api/admin/users/[id]/avatar

Removes a user's avatar.

```typescript
// Response Type
interface AvatarDeleteResponse {
  success: boolean;
  error?: string;
}
```

## Common Types

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}
```

Common error codes:
- `CONFIG_NOT_FOUND`: Configuration not found
- `INVALID_CONFIG`: Invalid configuration data
- `UPLOAD_ERROR`: File upload error
- `BACKUP_ERROR`: Database backup error
- `RESTORE_ERROR`: Database restore error
- `PERMISSION_ERROR`: Insufficient permissions

## Configuration Flow

1. Initial configuration load from `/api/admin/app-config`
2. Asset management through upload endpoints
3. Theme and registration updates
4. Database management operations
5. Statistics collection and monitoring

## Security Considerations

1. Access Control
   - Admin-only endpoints
   - User preference restrictions
   - File upload validation
   - Backup security

2. Input Validation
   - Configuration validation
   - File type checking
   - Size limitations
   - Data sanitization

3. Error Handling
   - Consistent error format
   - Detailed error codes
   - Secure error messages
   - Audit logging

## Testing

Example test cases for configuration endpoint:

```typescript
describe('App Configuration API', () => {
  describe('PATCH /api/admin/app-config', () => {
    it('updates application name successfully', async () => {
      const response = await fetch('/api/admin/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: 'New App Name'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.config.appName).toBe('New App Name');
    });

    it('validates application name', async () => {
      const response = await fetch('/api/admin/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: ''
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_CONFIG');
    });
  });
});
``` 
