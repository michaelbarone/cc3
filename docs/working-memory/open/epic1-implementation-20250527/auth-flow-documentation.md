# Authentication Flow Documentation

## Standard Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginUI as Login Page UI
    participant NextAuth as NextAuth.js
    participant API as API Routes
    participant DB as Prisma/Database
    
    User->>LoginUI: Visit /login
    LoginUI->>API: GET /api/auth/user-tiles
    API->>DB: Query active users
    DB-->>API: Return user list
    API-->>LoginUI: User tiles data
    LoginUI-->>User: Display user tiles
    
    User->>LoginUI: Click user tile
    LoginUI-->>User: Show password form
    
    User->>LoginUI: Enter password + Remember Me option
    LoginUI->>NextAuth: POST /api/auth/[...nextauth]/signin
    NextAuth->>DB: Verify credentials
    DB-->>NextAuth: User verified (with settings)
    NextAuth-->>LoginUI: Set session cookie + redirect
    LoginUI-->>User: Redirect to /dashboard
    
    User->>NextAuth: Access protected route
    NextAuth-->>User: Allow access if authenticated
```

## First Run Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginUI as Login Page UI
    participant API as API Routes
    participant Auth as NextAuth.js
    participant DB as Prisma/Database
    
    User->>LoginUI: Visit /login
    LoginUI->>API: GET /api/auth/first-run/check
    API->>DB: Check for admin users
    DB-->>API: No admin users found
    API-->>LoginUI: { isFirstRun: true }
    LoginUI-->>User: Show first run UI
    
    User->>LoginUI: Click "Setup Admin"
    LoginUI->>API: POST /api/auth/first-run/login
    API->>Auth: Create special first-run JWT
    Auth-->>LoginUI: Set temporary session
    LoginUI-->>User: Redirect to /first-run/set-admin-password
    
    User->>LoginUI: Enter admin password
    LoginUI->>API: POST /api/first-run/set-admin-password
    API->>DB: Create/update admin user + password
    DB-->>API: Success
    API->>Auth: Update session with full admin access
    Auth-->>LoginUI: Set proper session cookie
    LoginUI-->>User: Redirect to /dashboard
```

## Authentication Components

### NextAuth.js Configuration

- **Providers**: Credentials provider for username/password authentication
- **Callbacks**:
  - `jwt`: Includes user data and preferences in JWT payload
  - `session`: Exposes user data and preferences to client
  - `authorize`: Verifies credentials against database
- **Session Strategy**: JWT with HTTP-only cookies
- **Pages**: Custom login page at `/login`

### Database Schema

- **User Model**:
  - `id`: Unique identifier (UUID)
  - `name`: Username
  - `isAdmin`: Boolean flag for admin privileges
  - `isActive`: Boolean flag for account status
  - `password`: Bcrypt hashed password
  - `lastLoginAt`: Timestamp of last successful login
  - `createdAt`: Account creation timestamp
  - `updatedAt`: Account update timestamp
  
- **UserSetting Model**:
  - `userId`: Foreign key to User (also primary key)
  - `theme`: User theme preference (LIGHT, DARK, SYSTEM)
  - `menuPosition`: UI preference (TOP, SIDE)

### API Endpoints

- **`/api/auth/[...nextauth]`**: NextAuth.js endpoints for authentication
- **`/api/auth/user-tiles`**: Returns list of users for login tiles
- **`/api/auth/first-run/check`**: Checks if system is in first-run state
- **`/api/auth/first-run/login`**: Special endpoint for passwordless first-run login
- **`/api/first-run/set-admin-password`**: Sets password for admin during first run

### Environment Variables

- `NEXTAUTH_SECRET`: Secret for JWT token signing
- `NEXTAUTH_URL`: Base URL for callbacks
- `NEXTAUTH_SESSION_MAX_AGE_SECONDS`: Default session duration
- `NEXTAUTH_REMEMBER_ME_MAX_AGE_SECONDS`: Extended session duration for "Remember Me"
- `DATABASE_URL`: Connection string for SQLite database

## Security Considerations

1. **Password Security**:
   - Passwords are hashed using bcrypt
   - Password validation enforces minimum complexity
   - No password recovery in current version

2. **Session Security**:
   - JWT tokens stored in HTTP-only cookies
   - Session includes minimal user data
   - Session invalidation on user status change
   - CSRF protection enabled

3. **First Run Security**:
   - Special first-run mode only active when no admin users exist
   - Temporary session limited to password setup only
   - System transitions to normal mode after admin setup 
