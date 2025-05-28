# API Endpoints Documentation

## Authentication Endpoints

### NextAuth Endpoints

Base path: `/api/auth/[...nextauth]`

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/auth/signin` | GET | Displays signin page | - | Redirects to `/login` |
| `/api/auth/signin` | POST | Authenticates user | `{ username, password, csrfToken, callbackUrl, remember }` | JWT cookie + Redirect |
| `/api/auth/signout` | GET | Signs out user | - | Clears cookies + Redirect |
| `/api/auth/session` | GET | Gets session data | - | `{ user: { id, name, isAdmin, isActive, settings } }` |
| `/api/auth/csrf` | GET | Gets CSRF token | - | `{ csrfToken }` |
| `/api/auth/providers` | GET | Lists auth providers | - | `{ credentials: { id, name, type } }` |

### User Tiles Endpoint

Endpoint: `/api/auth/user-tiles`

**GET**

Returns a list of active users for the login page tiles.

Response:
```json
[
  {
    "id": "uuid-string",
    "name": "username",
    "lastLoginAt": "2025-05-27T18:30:00.000Z"  // ISO 8601 format, null if never logged in
  }
]
```

Status Codes:
- 200: Success
- 500: Server error

### First Run Check Endpoint

Endpoint: `/api/auth/first-run/check`

**GET**

Checks if the system is in first run state (no admin users exist).

Response:
```json
{
  "isFirstRun": true|false
}
```

Status Codes:
- 200: Success
- 500: Server error

### First Run Login Endpoint

Endpoint: `/api/auth/first-run/login`

**POST**

Provides a special login mechanism for first run, creating a temporary session for admin setup.

Request Body: None required

Response:
```json
{
  "success": true,
  "redirect": "/first-run/set-admin-password"
}
```

Status Codes:
- 200: Success
- 400: Not in first run state
- 500: Server error

## First Run Setup Endpoints

### Set Admin Password Endpoint

Endpoint: `/api/first-run/set-admin-password`

**POST**

Sets the password for the initial admin user during first run.

Request Body:
```json
{
  "password": "string", // Minimum 4 characters
  "confirmPassword": "string"
}
```

Response:
```json
{
  "success": true,
  "redirect": "/dashboard"
}
```

Status Codes:
- 200: Success
- 400: Validation error or passwords don't match
- 401: Not authenticated or not in first run state
- 500: Server error

## Data Validation

### User Tile Response

```typescript
// Zod schema for user tile response
const UserTileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  lastLoginAt: z.string().nullable() // ISO 8601 datetime
});

const UserTilesResponseSchema = z.array(UserTileSchema);
```

### Set Admin Password Request

```typescript
// Zod schema for password setup
const SetAdminPasswordSchema = z.object({
  password: z.string().min(4),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

## Authentication Flow

### Standard Login Flow

1. Client loads user tiles from `/api/auth/user-tiles`
2. User selects a tile and enters password
3. Client submits credentials to `/api/auth/signin`
4. Server validates credentials and creates JWT session
5. Client is redirected to `/dashboard` or specified callback URL

### First Run Flow

1. Client checks first run state from `/api/auth/first-run/check`
2. If isFirstRun is true, display first run options
3. User selects "Setup Admin"
4. Client posts to `/api/auth/first-run/login` to get temporary session
5. Client is redirected to `/first-run/set-admin-password`
6. User sets admin password
7. Client posts to `/api/first-run/set-admin-password`
8. Server creates/updates admin user and returns full session
9. Client is redirected to `/dashboard`

## Middleware Protection

All protected routes are guarded by middleware that checks:

1. Valid authentication (JWT session)
2. User.isActive status
3. Required permissions for specific routes

Protected path patterns:
- `/dashboard/:path*`
- `/settings/:path*`
- `/admin/:path*`

## Error Handling

All API endpoints follow a consistent error handling pattern:

```typescript
try {
  // API logic
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error("[API Error]", error);
  return NextResponse.json(
    { success: false, error: error.message || "An unexpected error occurred" },
    { status: error.status || 500 }
  );
}
```

## Security Considerations

1. All endpoints use CSRF protection provided by NextAuth.js
2. Authentication endpoints use HTTP-only cookies for session storage
3. Password validation enforces minimum security requirements
4. API responses never include sensitive information like password hashes
5. Rate limiting should be implemented for authentication endpoints

## Future API Considerations

1. User management endpoints (create, update, delete)
2. Password reset functionality
3. Multi-factor authentication support
4. Enhanced session management features
5. Account recovery options 
