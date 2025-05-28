# Authentication Testing Checklist

## Standard Authentication Flow

- [ ] Login page loads correctly with user tiles
- [ ] User tile transforms when clicked
- [ ] Password form appears within tile
- [ ] "Remember Me" checkbox functions correctly
- [ ] Invalid password shows appropriate error
- [ ] Valid login redirects to dashboard
- [ ] Session persists between page refreshes
- [ ] Extended session works with "Remember Me" checked
- [ ] Logout successfully terminates session
- [ ] Protected routes redirect to login when not authenticated

## First Run Experience

- [ ] System detects first run state correctly
- [ ] First run UI appears with setup options
- [ ] Admin can login without password initially
- [ ] Password setup form works correctly
- [ ] Password validation rules are enforced
- [ ] After password setup, admin is redirected to dashboard
- [ ] Subsequent logins require the newly set password
- [ ] "Restore from Backup" button is disabled with tooltip

## Edge Cases

- [ ] Session remains valid for inactive users
- [ ] Session is invalidated when user is marked inactive
- [ ] User preferences (theme, menuPosition) persist in session
- [ ] Session timeout works as expected
- [ ] Error handling works for network failures
- [ ] Multiple failed login attempts are handled correctly

## API Testing

- [ ] `/api/auth/user-tiles` returns correct user data
- [ ] `/api/auth/first-run/login` functions correctly
- [ ] `/api/first-run/set-admin-password` updates password correctly

## Security Checks

- [ ] Passwords are properly hashed in database
- [ ] JWT tokens are secure and include necessary claims
- [ ] HTTP-only cookies are used for session storage
- [ ] CSRF protection is implemented
- [ ] Session data does not expose sensitive information

## Documentation Tasks

- [x] Document authentication flow with diagram
- [x] Document database schema for User and UserSetting
- [x] Document API endpoints
- [x] Document environment variables
- [x] Create troubleshooting guide for common issues 
