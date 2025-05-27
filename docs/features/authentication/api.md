# Authentication API Documentation

## API Overview

### Base URL

- Development: `http://localhost:3000/api/auth`
- Production: `https://controlcenter.example.com/api/auth`

### Authentication

- Most endpoints require authentication via NextAuth.js
- JWT token stored in HTTP-only cookies
- Protected routes return 401 Unauthorized if not authenticated

## Endpoints

### `POST /api/auth/login`

#### Purpose

Authenticates a user with credentials and creates a session

#### Request Body

```typescript
interface LoginRequest {
  name: string;
  password: string;
  rememberMe?: boolean;
}
```

#### Response

```typescript
interface LoginResponse {
  user: {
    id: string;
    name: string;
    role: "ADMIN" | "USER";
    isActive: boolean;
    avatarUrl?: string;
  };
  // Session token is set in HTTP-only cookie
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin",
    "password": "securepassword",
    "rememberMe": true
  }'
```

#### Error Handling

- 400: Bad Request
  - Invalid parameters
  - Missing required fields
- 401: Unauthorized
  - Invalid credentials
  - Inactive user
- 500: Internal Server Error
  - Database connection issue

### `POST /api/auth/logout`

#### Purpose

Ends the current user session

#### Response

```typescript
interface LogoutResponse {
  success: boolean;
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/auth/logout" \
  -H "Authorization: Bearer {token}"
```

### `POST /api/auth/first-run/set-admin-password`

#### Purpose

Sets the initial admin password during first run

#### Request Body

```typescript
interface SetAdminPasswordRequest {
  password: string;
  confirmPassword: string;
}
```

#### Response

```typescript
interface SetAdminPasswordResponse {
  success: boolean;
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/auth/first-run/set-admin-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "password": "securepassword",
    "confirmPassword": "securepassword"
  }'
```

#### Error Handling

- 400: Bad Request
  - Password complexity requirements not met
  - Passwords don't match
- 403: Forbidden
  - Not in first run state
  - Not authorized as admin
- 500: Internal Server Error
  - Database error

### `GET /api/auth/session`

#### Purpose

Gets the current session information

#### Response

```typescript
interface SessionResponse {
  user: {
    id: string;
    name: string;
    role: "ADMIN" | "USER";
    isActive: boolean;
    avatarUrl?: string;
    settings: {
      theme: "LIGHT" | "DARK" | "SYSTEM";
      menuPosition: "TOP" | "SIDE";
    }
  };
}
```

#### Example

```bash
curl -X GET "http://localhost:3000/api/auth/session" \
  -H "Authorization: Bearer {token}"
```

### `POST /api/auth/change-password`

#### Purpose

Changes the password for the current authenticated user

#### Request Body

```typescript
interface ChangePasswordRequest {
  currentPassword?: string; // Required if user has existing password
  newPassword: string;
  confirmPassword: string;
}
```

#### Response

```typescript
interface ChangePasswordResponse {
  success: boolean;
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword",
    "confirmPassword": "newpassword"
  }'
```

### `POST /api/auth/avatar/upload`

#### Purpose

Uploads a new avatar for the current user

#### Request

- Multipart form data with file upload
- Maximum file size: 1MB
- Supported formats: JPG, PNG, GIF

#### Response

```typescript
interface AvatarUploadResponse {
  success: boolean;
  avatarUrl: string;
}
```

#### Example

```bash
curl -X POST "http://localhost:3000/api/auth/avatar/upload" \
  -H "Authorization: Bearer {token}" \
  -F "avatar=@/path/to/avatar.jpg"
```

### `DELETE /api/auth/avatar`

#### Purpose

Removes the current user's avatar

#### Response

```typescript
interface AvatarDeleteResponse {
  success: boolean;
}
```

#### Example

```bash
curl -X DELETE "http://localhost:3000/api/auth/avatar" \
  -H "Authorization: Bearer {token}"
```

## Data Models

### User

```typescript
interface User {
  id: string;
  name: string;
  passwordHash: string | null;
  role: "ADMIN" | "USER";
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### UserSetting

```typescript
interface UserSetting {
  userId: string;
  theme: "LIGHT" | "DARK" | "SYSTEM";
  menuPosition: "TOP" | "SIDE";
  createdAt: string;
  updatedAt: string;
}
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Common Error Codes

- `INVALID_CREDENTIALS`: Username or password is incorrect
- `USER_INACTIVE`: User account is disabled
- `PASSWORD_MISMATCH`: Passwords don't match
- `PASSWORD_COMPLEXITY`: Password doesn't meet requirements
- `NOT_FIRST_RUN`: System is not in first run state
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Permission denied
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FILE_TYPE`: File type not supported

## Versioning

### Current Version

- API Version: v1
- Deprecation policy: No deprecations planned for MVP

## Testing

### Curl Examples

- Login:
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin",
    "password": "password123",
    "rememberMe": true
  }'
```

- Session check:
```bash
curl -X GET "http://localhost:3000/api/auth/session" \
  -H "Cookie: next-auth.session-token=..."
``` 
