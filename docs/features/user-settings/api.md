# User Settings & Preferences API

## API Overview

This document details the API endpoints for managing user preferences, including theme settings and menu position preferences.

## Preference Endpoints

### GET /api/user/preferences

Retrieves the current user's preferences.

```typescript
// Response Type
interface GetPreferencesResponse {
  preferences: {
    menuPosition: 'side' | 'top';
    themeMode: 'light' | 'dark';
  };
  rawPreferences?: {
    id: string;
    menuPosition: string | null;
    themeMode: string | null;
  };
}
```

Example Response:
```json
{
  "preferences": {
    "menuPosition": "side",
    "themeMode": "light"
  }
}
```

### POST /api/user/preferences

Updates user preferences.

```typescript
// Request Type
interface UpdatePreferencesRequest {
  menuPosition?: 'side' | 'top';
  themeMode?: 'light' | 'dark';
}

// Response Type
interface UpdatePreferencesResponse {
  preferences: {
    menuPosition: 'side' | 'top';
    themeMode: 'light' | 'dark';
  };
  rawPreferences?: {
    id: string;
    menuPosition: string | null;
    themeMode: string | null;
  };
  success: boolean;
}
```

Example Request:
```json
{
  "themeMode": "dark",
  "menuPosition": "top"
}
```

Example Response:
```json
{
  "preferences": {
    "menuPosition": "top",
    "themeMode": "dark"
  },
  "success": true
}
```

## Common Types

### Error Response

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

Common error codes:
- `UNAUTHORIZED`: User is not authenticated
- `NOT_FOUND`: User not found
- `VALIDATION_ERROR`: Invalid preference values
- `UPDATE_ERROR`: Failed to update preferences

## Preference Management Flow

1. Initial Load
   ```typescript
   // 1. Fetch current preferences
   const response = await fetch('/api/user/preferences');
   const data = await response.json();
   
   // 2. Apply preferences
   applyTheme(data.preferences.themeMode);
   setMenuPosition(data.preferences.menuPosition);
   ```

2. Update Preferences
   ```typescript
   // 1. Send update request
   const response = await fetch('/api/user/preferences', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ themeMode: 'dark' })
   });
   
   // 2. Handle response
   const data = await response.json();
   if (data.success) {
     // Apply updates
   }
   ```

## Security Considerations

1. Authentication
   - All endpoints require valid JWT token
   - Token must be sent in HTTP-only cookie
   - Session validation on each request

2. Input Validation
   ```typescript
   // Theme validation
   if (themeMode && !['light', 'dark'].includes(themeMode)) {
     return {
       error: 'Invalid theme mode',
       code: 'VALIDATION_ERROR'
     };
   }

   // Menu position validation
   if (menuPosition && !['side', 'top'].includes(menuPosition)) {
     return {
       error: 'Invalid menu position',
       code: 'VALIDATION_ERROR'
     };
   }
   ```

3. Rate Limiting
   ```typescript
   const rateLimit = {
     window: 60000, // 1 minute
     max: 10 // requests
   };
   ```

## Testing

Example test cases for preference endpoints:

```typescript
describe('User Preferences API', () => {
  describe('GET /api/user/preferences', () => {
    it('returns current preferences for authenticated user', async () => {
      const response = await fetch('/api/user/preferences', {
        headers: {
          Cookie: `token=${validToken}`
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.preferences).toHaveProperty('themeMode');
      expect(data.preferences).toHaveProperty('menuPosition');
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await fetch('/api/user/preferences');
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/user/preferences', () => {
    it('updates theme mode successfully', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${validToken}`
        },
        body: JSON.stringify({
          themeMode: 'dark'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preferences.themeMode).toBe('dark');
    });

    it('validates menu position value', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${validToken}`
        },
        body: JSON.stringify({
          menuPosition: 'invalid'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid menu position. Must be "side" or "top".');
    });

    it('handles partial updates', async () => {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${validToken}`
        },
        body: JSON.stringify({
          themeMode: 'light'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preferences.themeMode).toBe('light');
      // Menu position should remain unchanged
      expect(data.preferences.menuPosition).toBe('side');
    });
  });
});
```

## Error Handling

Example error responses:

1. Unauthorized Access
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

2. Validation Error
```json
{
  "error": "Invalid theme mode. Must be \"light\" or \"dark\".",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "themeMode",
    "value": "invalid",
    "allowed": ["light", "dark"]
  }
}
```

3. Update Error
```json
{
  "error": "Failed to update user preferences",
  "code": "UPDATE_ERROR",
  "details": {
    "reason": "Database error"
  }
}
```

## Performance Considerations

1. Caching Strategy
```typescript
const cacheConfig = {
  maxAge: 5000, // 5 seconds
  staleWhileRevalidate: true,
  revalidateOnFocus: false
};
```

2. Request Optimization
```typescript
// Batch updates
interface BatchUpdateRequest {
  updates: Array<{
    key: keyof UserPreferences;
    value: unknown;
  }>;
}
```

3. Response Size
```typescript
// Minimal response format
interface MinimalResponse {
  s: boolean;  // success
  p: {         // preferences
    m: string; // menuPosition
    t: string; // themeMode
  };
}
``` 
