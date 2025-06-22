# Authentication & User Management API

## API Overview

This document details the API endpoints for authentication, user management, and settings management.

## Authentication Endpoints

### GET /api/auth/users

Retrieves a list of users for the login page.

```typescript
// Response Type
interface UserListResponse {
  users: Array<{
    id: string;
    username: string;
    avatar_url?: string;
    has_password: boolean;
  }>;
}
```

### POST /api/auth/login

Authenticates a user and creates a session.

```typescript
// Request Type
interface LoginRequest {
  userId: string;
  password?: string;
  remember?: boolean;
}

// Response Type
interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    is_admin: boolean;
    avatar_url?: string;
  };
  error?: string;
}
```

### POST /api/auth/logout

Ends the current user session and removes authentication cookie.

```typescript
// Response Type
interface LogoutResponse {
  success: boolean;
  error?: string;
}
```

Key Features:
- Removes HTTP-only auth_token cookie
- Invalidates current session
- Forces page reload for clean state

### GET /api/auth/session

Retrieves the current session information.

```typescript
// Response Type
interface SessionResponse {
  user?: {
    id: string;
    username: string;
    is_admin: boolean;
    avatar_url?: string;
  };
  error?: string;
}
```

## User Management Endpoints

### GET /api/users/[id]

Retrieves user details.

```typescript
// Response Type
interface UserResponse {
  user: {
    id: string;
    username: string;
    is_admin: boolean;
    avatar_url?: string;
    has_password: boolean;
    settings: UserSettings;
  };
}
```

### PATCH /api/users/[id]

Updates user information.

```typescript
// Request Type
interface UpdateUserRequest {
  username?: string;
  is_admin?: boolean;
  password?: string;
  settings?: Partial<UserSettings>;
}

// Response Type
interface UpdateUserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    is_admin: boolean;
    avatar_url?: string;
    settings: UserSettings;
  };
  error?: string;
}
```

### DELETE /api/users/[id]

Deletes a user account.

```typescript
// Response Type
interface DeleteUserResponse {
  success: boolean;
  error?: string;
}
```

## Profile Management Endpoints

### POST /api/users/[id]/avatar

Uploads a user avatar.

```typescript
// Request Type
// Multipart form data with 'avatar' file field

// Response Type
interface AvatarUploadResponse {
  success: boolean;
  avatar_url?: string;
  error?: string;
}
```

### DELETE /api/users/[id]/avatar

Removes a user's avatar.

```typescript
// Response Type
interface AvatarDeleteResponse {
  success: boolean;
  error?: string;
}
```

### POST /api/users/[id]/password

Updates user password.

```typescript
// Request Type
interface PasswordUpdateRequest {
  current_password?: string;
  new_password: string;
}

// Response Type
interface PasswordUpdateResponse {
  success: boolean;
  error?: string;
  validationErrors?: string[]; // Array of validation errors if password doesn't meet complexity requirements
}
```

Key Features:
- Validates new passwords against configured complexity requirements
- Only validates new passwords, not existing ones
- Returns specific validation errors when requirements aren't met
- Complexity requirements are configurable in admin settings
- Current password verification for security

## Settings Management Endpoints

### GET /api/users/[id]/settings

Retrieves user settings.

```typescript
// Response Type
interface UserSettingsResponse {
  settings: UserSettings;
}
```

### PATCH /api/users/[id]/settings

Updates user settings.

```typescript
// Request Type
interface UpdateSettingsRequest {
  settings: Partial<UserSettings>;
}

// Response Type
interface UpdateSettingsResponse {
  success: boolean;
  settings?: UserSettings;
  error?: string;
}
```

## Common Types

### User Settings Type

```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  menu_position: 'left' | 'top';
  remember_me: boolean;
  last_active_url?: string;
}
```

## Error Handling

All endpoints follow a consistent error response format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}
```

Common error codes:
- `UNAUTHORIZED`: User is not authenticated
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Invalid request data
- `INTERNAL_ERROR`: Server-side error

## Authentication Flow

1. Client requests user list from `/api/auth/users`
2. User selects account from displayed tiles
3. If password required, client submits credentials to `/api/auth/login`
4. Server validates credentials and returns session token
5. Client includes session token in subsequent requests
6. Session can be verified using `/api/auth/session`
7. Session can be terminated using `/api/auth/logout`

## Security Considerations

1. Rate Limiting
   - Login attempts are limited to 5 per minute per IP
   - Password updates are limited to 3 per hour per user
   - Avatar uploads are limited to 10 per hour per user

2. File Upload Security
   - Avatar uploads are limited to 5MB
   - Only image files (jpg, png, gif) are accepted
   - Files are scanned for malware
   - Metadata is stripped from images

3. Password Security
   - Passwords are hashed using bcrypt
   - Minimum password length of 8 characters
   - Password strength requirements enforced
   - Password history maintained to prevent reuse

4. Session Security
   - JWT tokens with short expiration
   - HTTP-only secure cookies
   - CSRF protection implemented
   - Session invalidation on password change

## Testing

Example test cases for each endpoint:

```typescript
describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user',
          password: 'valid-password'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user',
          password: 'wrong-password'
        })
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
``` 
