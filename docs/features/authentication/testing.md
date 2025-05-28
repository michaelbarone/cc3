# Authentication Testing Documentation

## Test Strategy

### Scope

- Authentication flow components
- Login process
- First-run admin setup
- Password management
- Avatar upload and management
- Session handling and persistence
- Authentication middleware

### Test Types

1. Unit Tests

   - Authentication service functions
   - Password validation utilities
   - Avatar handling utilities
   - Component rendering tests

2. Integration Tests

   - Login flow with NextAuth.js
   - API endpoint interaction
   - Database interaction through Prisma

3. E2E Tests
   - Complete login flow
   - First-run admin setup flow
   - User profile management

## Test Cases

### Unit Tests

#### AuthService

```typescript
describe("authService", () => {
  test("validateCredentials returns user with valid credentials", async () => {
    // Mock Prisma client
    prismaMock.user.findUnique.mockResolvedValue({
      id: "1",
      name: "testuser",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "USER",
      isActive: true,
    });

    // Test function
    const result = await authService.validateCredentials("testuser", "password123");
    
    // Assertions
    expect(result).toHaveProperty("id", "1");
    expect(result).toHaveProperty("name", "testuser");
  });

  test("validateCredentials returns null with invalid password", async () => {
    // Mock Prisma client
    prismaMock.user.findUnique.mockResolvedValue({
      id: "1",
      name: "testuser",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "USER",
      isActive: true,
    });

    // Test function
    const result = await authService.validateCredentials("testuser", "wrongpassword");
    
    // Assertions
    expect(result).toBeNull();
  });

  test("validateCredentials returns null for inactive user", async () => {
    // Mock Prisma client
    prismaMock.user.findUnique.mockResolvedValue({
      id: "1",
      name: "testuser",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "USER",
      isActive: false,
    });

    // Test function
    const result = await authService.validateCredentials("testuser", "password123");
    
    // Assertions
    expect(result).toBeNull();
  });
});
```

#### PasswordChangeForm Component

```typescript
describe("PasswordChangeForm", () => {
  test("renders correctly with existing password", () => {
    render(<PasswordChangeForm hasExistingPassword={true} />);
    
    // Check form elements
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("shows validation errors for password mismatch", async () => {
    render(<PasswordChangeForm hasExistingPassword={false} />);
    
    // Fill in mismatched passwords
    await userEvent.type(screen.getByLabelText(/new password/i), "newpass123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    
    // Check for error message
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  test("calls onSuccess when form submitted successfully", async () => {
    // Mock API call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const onSuccess = vi.fn();
    render(<PasswordChangeForm hasExistingPassword={false} onSuccess={onSuccess} />);
    
    // Fill form correctly
    await userEvent.type(screen.getByLabelText(/new password/i), "newpass123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "newpass123");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    
    // Wait for async operation
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### API Tests

#### Login API

```typescript
describe("POST /api/auth/login", () => {
  test("returns user data with valid credentials", async () => {
    // Create test user in database
    const passwordHash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        name: "testuser",
        passwordHash,
        role: "USER",
        isActive: true,
      },
    });

    // Test API call
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "testuser",
        password: "password123",
      }),
    });

    // Assertions
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toHaveProperty("name", "testuser");
  });

  test("returns 401 with invalid credentials", async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "testuser",
        password: "wrongpassword",
      }),
    });

    // Assertions
    expect(response.status).toBe(401);
  });
});
```

#### First-Run Password Setup API

```typescript
describe("POST /api/auth/first-run/set-admin-password", () => {
  test("sets admin password during first run", async () => {
    // Create admin user with no password (first-run state)
    await prisma.user.create({
      data: {
        name: "admin",
        passwordHash: null,
        role: "ADMIN",
        isActive: true,
      },
    });

    // Mock authenticated session for admin
    const { getServerSession } = await import("next-auth");
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "admin", role: "ADMIN" },
    });

    // Test API call
    const response = await fetch("/api/auth/first-run/set-admin-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "adminpass123",
        confirmPassword: "adminpass123",
      }),
    });

    // Assertions
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify database update
    const admin = await prisma.user.findUnique({ where: { name: "admin" } });
    expect(admin?.passwordHash).not.toBeNull();
    expect(admin?.lastLoginAt).not.toBeNull();
  });

  test("returns 403 when not in first-run state", async () => {
    // Create admin user with password (not first-run state)
    const passwordHash = await bcrypt.hash("existingpass", 10);
    await prisma.user.create({
      data: {
        name: "admin",
        passwordHash,
        role: "ADMIN",
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    // Mock authenticated session for admin
    const { getServerSession } = await import("next-auth");
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "1", name: "admin", role: "ADMIN" },
    });

    // Test API call
    const response = await fetch("/api/auth/first-run/set-admin-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "adminpass123",
        confirmPassword: "adminpass123",
      }),
    });

    // Assertions
    expect(response.status).toBe(403);
  });
});
```

### Integration Tests

#### Feature Flow

```typescript
describe("Authentication Integration", () => {
  test("complete login and profile update flow", async () => {
    // Create test user
    const passwordHash = await bcrypt.hash("testpass", 10);
    const user = await prisma.user.create({
      data: {
        name: "testuser",
        passwordHash,
        role: "USER",
        isActive: true,
      },
    });

    // Step 1: Login
    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "testuser",
        password: "testpass",
      }),
    });
    expect(loginResponse.status).toBe(200);
    
    // Get cookies for subsequent requests
    const cookies = loginResponse.headers.get("set-cookie");
    
    // Step 2: Update password
    const passwordResponse = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies,
      },
      body: JSON.stringify({
        currentPassword: "testpass",
        newPassword: "newpassword",
        confirmPassword: "newpassword",
      }),
    });
    expect(passwordResponse.status).toBe(200);
    
    // Step 3: Verify session
    const sessionResponse = await fetch("/api/auth/session", {
      headers: { "Cookie": cookies },
    });
    expect(sessionResponse.status).toBe(200);
    const sessionData = await sessionResponse.json();
    expect(sessionData.user.name).toBe("testuser");
  });
});
```

### E2E Tests

#### User Journey

```typescript
describe("Authentication User Journey", () => {
  test("completes login and password change flow", async () => {
    // Setup: Create test user via API
    await page.request.post("/api/test/setup", {
      data: {
        user: {
          name: "testuser",
          password: "testpass",
          role: "USER",
        }
      }
    });
    
    // Step 1: Navigate to login page
    await page.goto("/login");
    
    // Step 2: Find and click user tile
    await page.getByText("testuser").click();
    
    // Step 3: Enter password and submit
    await page.getByLabel("Password").fill("testpass");
    await page.getByRole("button", { name: "Login" }).click();
    
    // Step 4: Verify redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    
    // Step 5: Navigate to profile settings
    await page.getByRole("button", { name: "User Menu" }).click();
    await page.getByText("Settings").click();
    
    // Step 6: Change password
    await page.getByLabel("Current Password").fill("testpass");
    await page.getByLabel("New Password").fill("newpassword");
    await page.getByLabel("Confirm Password").fill("newpassword");
    await page.getByRole("button", { name: "Change Password" }).click();
    
    // Step 7: Verify success message
    await expect(page.getByText("Password updated successfully")).toBeVisible();
    
    // Step 8: Logout
    await page.getByRole("button", { name: "User Menu" }).click();
    await page.getByText("Logout").click();
    
    // Step 9: Verify redirect to login
    await expect(page).toHaveURL("/login");
    
    // Step 10: Login with new password
    await page.getByText("testuser").click();
    await page.getByLabel("Password").fill("newpassword");
    await page.getByRole("button", { name: "Login" }).click();
    
    // Step 11: Verify successful login
    await expect(page).toHaveURL("/dashboard");
  });
});
```

## Test Data

### Mock Data

```typescript
const mockUsers = [
  {
    id: "1",
    name: "admin",
    passwordHash: "$2a$10$...", // bcrypt hash of "adminpass"
    role: "ADMIN",
    isActive: true,
    lastLoginAt: null,
  },
  {
    id: "2",
    name: "user1",
    passwordHash: "$2a$10$...", // bcrypt hash of "userpass"
    role: "USER",
    isActive: true,
    lastLoginAt: "2025-01-01T12:00:00Z",
  },
  {
    id: "3",
    name: "inactiveuser",
    passwordHash: "$2a$10$...", // bcrypt hash of "userpass"
    role: "USER",
    isActive: false,
    lastLoginAt: "2025-01-01T12:00:00Z",
  }
];

const mockUserSettings = [
  {
    userId: "1",
    theme: "DARK",
    menuPosition: "SIDE",
  },
  {
    userId: "2",
    theme: "LIGHT",
    menuPosition: "TOP",
  }
];
```

### Test Users

- Admin user (first-run state)
  - name: "admin"
  - passwordHash: null
  - role: "ADMIN"
  - isActive: true
  - lastLoginAt: null

- Admin user (normal state)
  - name: "admin"
  - passwordHash: (hashed "adminpass")
  - role: "ADMIN"
  - isActive: true
  - lastLoginAt: (timestamp)

- Regular user
  - name: "user1"
  - passwordHash: (hashed "userpass")
  - role: "USER"
  - isActive: true
  - lastLoginAt: (timestamp)

- Inactive user
  - name: "inactiveuser"
  - passwordHash: (hashed "userpass")
  - role: "USER"
  - isActive: false
  - lastLoginAt: (timestamp)

### API Mocks

```typescript
const apiMocks = {
  login: {
    success: {
      status: 200,
      body: {
        user: {
          id: "1",
          name: "testuser",
          role: "USER",
          isActive: true,
        }
      }
    },
    invalidCredentials: {
      status: 401,
      body: {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password"
        }
      }
    },
    inactiveUser: {
      status: 401,
      body: {
        error: {
          code: "USER_INACTIVE",
          message: "User account is inactive"
        }
      }
    }
  },
  session: {
    authenticated: {
      status: 200,
      body: {
        user: {
          id: "1",
          name: "testuser",
          role: "USER",
          isActive: true,
          settings: {
            theme: "DARK",
            menuPosition: "SIDE"
          }
        }
      }
    },
    unauthenticated: {
      status: 401,
      body: {
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        }
      }
    }
  }
};
```

## Performance Testing

### Metrics

- Login response time: < 300ms
- Session validation time: < 50ms
- Password hashing time: < 500ms

### Benchmarks

- Login flow completes in < 1 second
- Session validation in middleware < 100ms
- Avatar upload and processing < 2 seconds

## Error Scenarios

### User Input Errors

- Empty username or password
- Password too short (< 4 characters)
- Password and confirmation mismatch
- Inactive user attempting to log in

### System Errors

- Database connection failures
- NextAuth.js configuration issues
- File system errors during avatar upload

## Test Environment

### Setup

```bash
# Environment setup commands
npm install
npx prisma migrate dev
npm run test:setup:auth
```

### Configuration

```typescript
// Test configuration
const testConfig = {
  testUsers: {
    admin: {
      name: "admin",
      password: "adminpass",
      role: "ADMIN"
    },
    user: {
      name: "testuser",
      password: "testpass",
      role: "USER"
    }
  },
  testFiles: {
    validAvatar: "./test/fixtures/valid-avatar.jpg",
    oversizedAvatar: "./test/fixtures/oversized-avatar.jpg",
    invalidFileType: "./test/fixtures/invalid.txt"
  }
};
```

## CI/CD Integration

### Pipeline Steps

1. Unit tests: Test auth services and utilities
2. Integration tests: Test API endpoints
3. E2E tests: Test user journeys

## Test Reports

### Coverage

- Component coverage target: 90%
- API route coverage target: 95%
- Utility function coverage target: 100%

## Debugging Guide

### Common Issues

- Session not persisting between tests
  - Ensure HTTP-only cookies are being properly handled in tests
  - Check NextAuth.js configuration in test environment

- Password validation failures
  - Verify bcrypt import and configuration
  - Check for correct password complexity requirements

- Avatar upload failures
  - Verify file system permissions in test environment
  - Check formidable configuration for multipart form handling 
