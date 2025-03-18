# URL Management & IFrame Container API

## API Overview

This document details the API endpoints for URL group management, URL operations, and state management.

## URL Group Endpoints

### GET /api/url-groups

Retrieves all URL groups for the current user.

```typescript
// Response Type
interface UrlGroupListResponse {
  groups: Array<{
    id: string;
    name: string;
    description?: string;
    display_order: number;
    urls: Url[];
  }>;
}
```

### POST /api/url-groups

Creates a new URL group.

```typescript
// Request Type
interface CreateUrlGroupRequest {
  name: string;
  description?: string;
  display_order?: number;
}

// Response Type
interface CreateUrlGroupResponse {
  success: boolean;
  group?: {
    id: string;
    name: string;
    description?: string;
    display_order: number;
  };
  error?: string;
}
```

### PATCH /api/url-groups/[id]

Updates an existing URL group.

```typescript
// Request Type
interface UpdateUrlGroupRequest {
  name?: string;
  description?: string;
  display_order?: number;
}

// Response Type
interface UpdateUrlGroupResponse {
  success: boolean;
  group?: {
    id: string;
    name: string;
    description?: string;
    display_order: number;
  };
  error?: string;
}
```

### DELETE /api/url-groups/[id]

Deletes a URL group.

```typescript
// Response Type
interface DeleteUrlGroupResponse {
  success: boolean;
  error?: string;
}
```

## URL Management Endpoints

### GET /api/urls

Retrieves URLs for a specific group.

```typescript
// Query Parameters
interface GetUrlsQuery {
  group_id?: string;
  include_mobile?: boolean;
}

// Response Type
interface UrlListResponse {
  urls: Array<{
    id: string;
    group_id: string;
    title: string;
    url: string;
    mobile_url?: string;
    icon_path?: string;
    display_order: number;
    idle_timeout?: number;
  }>;
}
```

### POST /api/urls

Creates a new URL.

```typescript
// Request Type
interface CreateUrlRequest {
  group_id: string;
  title: string;
  url: string;
  mobile_url?: string;
  icon_path?: string;
  display_order?: number;
  idle_timeout?: number;
}

// Response Type
interface CreateUrlResponse {
  success: boolean;
  url?: Url;
  error?: string;
}
```

### PATCH /api/urls/[id]

Updates an existing URL.

```typescript
// Request Type
interface UpdateUrlRequest {
  title?: string;
  url?: string;
  mobile_url?: string;
  icon_path?: string;
  display_order?: number;
  idle_timeout?: number;
}

// Response Type
interface UpdateUrlResponse {
  success: boolean;
  url?: Url;
  error?: string;
}
```

### DELETE /api/urls/[id]

Deletes a URL.

```typescript
// Response Type
interface DeleteUrlResponse {
  success: boolean;
  error?: string;
}
```

## State Management Endpoints

### GET /api/urls/state

Retrieves the current state of URLs.

```typescript
// Response Type
interface UrlStateResponse {
  states: Array<{
    url: string;
    isLoaded: boolean;
    isVisible: boolean;
    error?: string;
    lastActive: string;
  }>;
}
```

### POST /api/urls/state

Updates URL states.

```typescript
// Request Type
interface UpdateUrlStateRequest {
  states: Array<{
    url: string;
    isLoaded?: boolean;
    isVisible?: boolean;
    error?: string;
  }>;
}

// Response Type
interface UpdateUrlStateResponse {
  success: boolean;
  states?: Array<{
    url: string;
    isLoaded: boolean;
    isVisible: boolean;
    error?: string;
    lastActive: string;
  }>;
  error?: string;
}
```

## Icon Management Endpoints

### POST /api/urls/[id]/icon

Uploads an icon for a URL.

```typescript
// Request Type
// Multipart form data with 'icon' file field

// Response Type
interface IconUploadResponse {
  success: boolean;
  icon_path?: string;
  error?: string;
}
```

### DELETE /api/urls/[id]/icon

Removes a URL's icon.

```typescript
// Response Type
interface IconDeleteResponse {
  success: boolean;
  error?: string;
}
```

## Common Types

### URL Type

```typescript
interface Url {
  id: string;
  group_id: string;
  title: string;
  url: string;
  mobile_url?: string;
  icon_path?: string;
  display_order: number;
  idle_timeout?: number;
  created_at: Date;
  updated_at: Date;
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
- `NOT_FOUND`: URL or group not found
- `VALIDATION_ERROR`: Invalid request data
- `DUPLICATE_ERROR`: URL already exists
- `ORDER_CONFLICT`: Display order conflict
- `ICON_ERROR`: Icon upload/processing error

## URL Management Flow

1. Client requests URL groups from `/api/url-groups`
2. Groups are displayed in menu structure
3. URLs within groups are loaded from `/api/urls`
4. State changes are tracked via `/api/urls/state`
5. Icons are managed through icon endpoints
6. Updates are synchronized across clients

## Security Considerations

1. URL Validation
   - URL format validation
   - Protocol restrictions
   - Domain validation
   - XSS prevention

2. Icon Security
   - File type validation
   - Size restrictions
   - Malware scanning
   - Storage security

3. Access Control
   - User permissions
   - Group access
   - Rate limiting
   - Audit logging

## Testing

Example test cases for each endpoint:

```typescript
describe('URL Management API', () => {
  describe('POST /api/urls', () => {
    it('should create a new URL successfully', async () => {
      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: 'test-group',
          title: 'Test URL',
          url: 'https://example.com'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.url).toBeDefined();
    });

    it('should validate URL format', async () => {
      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: 'test-group',
          title: 'Invalid URL',
          url: 'invalid-url'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('VALIDATION_ERROR');
    });
  });
});
``` 
