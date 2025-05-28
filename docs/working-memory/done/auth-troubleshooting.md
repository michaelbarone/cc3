# Authentication Troubleshooting Guide

## Common Issues and Solutions

### Login Issues

| Issue | Possible Causes | Solution |
|-------|----------------|----------|
| Login page shows no user tiles | - Database connection issue<br>- No users in database<br>- API route error | - Check database connection<br>- Verify users exist and are active<br>- Check browser console for API errors<br>- Verify network request to /api/auth/user-tiles |
| Cannot click on user tiles | - JavaScript error<br>- CSS issue | - Check browser console for errors<br>- Verify CSS for user tiles is loading<br>- Try clearing browser cache |
| Password not accepted | - Incorrect password<br>- User marked as inactive<br>- Password hash mismatch | - Verify password is correct<br>- Check user.isActive status in database<br>- Reset password if necessary |
| "Remember Me" not working | - Cookie settings issue<br>- MaxAge not properly set | - Check browser cookie settings<br>- Verify NEXTAUTH_REMEMBER_ME_MAX_AGE_SECONDS is set<br>- Check NextAuth callbacks for maxAge setting |
| Redirect loop after login | - Middleware configuration issue<br>- Session validation error | - Check middleware matcher configuration<br>- Verify session structure in NextAuth callbacks<br>- Look for console errors during redirect |

### First Run Issues

| Issue | Possible Causes | Solution |
|-------|----------------|----------|
| First run screen not showing | - Admin user already exists<br>- API route error | - Check database for existing admin users<br>- Verify /api/auth/first-run/check API response<br>- Check browser console for errors |
| Cannot proceed with admin setup | - Temporary session not created<br>- Redirect issue | - Check JWT creation in first-run login API<br>- Verify redirection to password setup page<br>- Check browser console for errors |
| Password setup fails | - Password validation error<br>- Database update issue<br>- API error | - Ensure password meets complexity requirements<br>- Check API response for specific error messages<br>- Verify database permissions |
| Stuck in first run mode | - Failed to create admin user<br>- Database transaction issue | - Check database for partial user records<br>- Verify transaction completion<br>- Check for database locking issues |

### Session Issues

| Issue | Possible Causes | Solution |
|-------|----------------|----------|
| Session expires too quickly | - MaxAge configuration issue<br>- JWT not properly configured | - Check NEXTAUTH_SESSION_MAX_AGE_SECONDS<br>- Verify jwt callback in NextAuth configuration<br>- Check for session updates that might invalidate it |
| Logged out unexpectedly | - Session invalidation<br>- User marked inactive<br>- Cookie cleared | - Check for code that might sign out users<br>- Verify user.isActive status hasn't changed<br>- Check for cookie clearing operations |
| Protected routes accessible without login | - Middleware matcher issue<br>- Session validation bypass | - Review middleware.ts matcher configuration<br>- Check session validation logic<br>- Verify route is included in protected paths |
| Cannot access route despite login | - Missing permissions<br>- isActive status issue<br>- JWT missing claims | - Check user permissions (isAdmin, etc.)<br>- Verify user.isActive is true<br>- Check JWT payload for required claims |

### Database Issues

| Issue | Possible Causes | Solution |
|-------|----------------|----------|
| Cannot connect to database | - Incorrect DATABASE_URL<br>- File permissions<br>- SQLite file corrupted | - Verify DATABASE_URL in .env<br>- Check file permissions on SQLite file<br>- Try creating a new database file |
| User record not created | - Validation error<br>- Database constraint error | - Check Prisma schema constraints<br>- Verify required fields are provided<br>- Check for unique constraint violations |
| UserSetting not linked to User | - Transaction failure<br>- Foreign key constraint | - Ensure User creation is in same transaction as UserSetting<br>- Check database for orphaned records<br>- Verify referential integrity |

## Debugging Techniques

### API Request Debugging

1. Use browser developer tools to inspect network requests
2. Check request/response payloads for errors
3. Verify API endpoint URLs are correct
4. Test API endpoints with tools like Postman

Example curl commands for testing API endpoints:

```bash
# Check user tiles API
curl -X GET http://localhost:3000/api/auth/user-tiles

# Check first run status
curl -X GET http://localhost:3000/api/auth/first-run/check
```

### Session Debugging

1. Examine cookies in browser developer tools
2. Decode JWT payload using tools like jwt.io
3. Check session data in React DevTools (if using client components)

Example JWT debugging:

```javascript
// In browser console
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('next-auth.session-token='))
  .split('=')[1];

// Decode payload (does not verify signature)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

### Database Debugging

1. Use SQLite CLI to examine database:

```bash
# Open SQLite database
sqlite3 ./data/dev.db

# List tables
.tables

# View users
SELECT * FROM User;

# View user settings
SELECT * FROM UserSetting;

# Check relationship
SELECT u.id, u.name, u.isAdmin, us.theme, us.menuPosition 
FROM User u JOIN UserSetting us ON u.id = us.userId;
```

2. Check Prisma Studio:

```bash
npx prisma studio
```

## Logging

For enhanced debugging, consider adding structured logging to authentication-related components:

```typescript
// Example of enhanced logging for authentication
console.log("[Auth] Login attempt", { 
  username, 
  success: !!user,
  timestamp: new Date().toISOString()
});
```

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `CredentialsSignin` | Invalid credentials | Verify username and password |
| `AccessDenied` | User lacks permission | Check user.isAdmin and isActive status |
| `SessionRequired` | No valid session | User needs to login again |
| `DatabaseError` | Database operation failed | Check database connection and schema |
| `Configuration` | NextAuth configuration issue | Verify NextAuth setup and environment variables | 
