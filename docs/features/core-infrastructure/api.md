# Core Infrastructure API Documentation

## Health Check Endpoints

### GET /api/health
Checks the overall health of the application.

```typescript
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    filesystem: boolean;
    memory: boolean;
  };
  version: string;
}
```

Response Example:
```json
{
  "status": "healthy",
  "timestamp": "2024-03-18T10:00:00Z",
  "checks": {
    "database": true,
    "filesystem": true,
    "memory": true
  },
  "version": "1.0.0"
}
```

## Database Management Endpoints

### GET /api/database/status
Checks database connection and migration status.

```typescript
interface DatabaseStatusResponse {
  connected: boolean;
  migrated: boolean;
  lastMigration: string;
  pendingMigrations: number;
}
```

Response Example:
```json
{
  "connected": true,
  "migrated": true,
  "lastMigration": "20240318100000_initial",
  "pendingMigrations": 0
}
```

### POST /api/database/migrate
Runs pending database migrations.

Request:
```typescript
interface MigrateRequest {
  force?: boolean;
}
```

Response:
```typescript
interface MigrateResponse {
  success: boolean;
  migrationsRun: number;
  errors?: string[];
}
```

## Configuration Endpoints

### GET /api/config/public
Retrieves public configuration settings.

```typescript
interface PublicConfigResponse {
  version: string;
  maintenance: boolean;
  features: {
    [key: string]: boolean;
  };
}
```

Response Example:
```json
{
  "version": "1.0.0",
  "maintenance": false,
  "features": {
    "darkMode": true,
    "analytics": false
  }
}
```

### POST /api/config/update
Updates configuration settings (admin only).

Request:
```typescript
interface UpdateConfigRequest {
  key: string;
  value: any;
}
```

Response:
```typescript
interface UpdateConfigResponse {
  success: boolean;
  updated: string[];
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "error details"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "unique-request-id"
}
```

## API Usage Examples

### Health Check Example
```typescript
async function checkHealth() {
  const response = await fetch('/api/health');
  const health: HealthResponse = await response.json();
  
  if (health.status === 'healthy') {
    console.log('All systems operational');
  } else {
    console.error('System health check failed');
  }
}
```

### Database Migration Example
```typescript
async function runMigrations() {
  const response = await fetch('/api/database/migrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ force: false })
  });
  
  const result: MigrateResponse = await response.json();
  
  if (result.success) {
    console.log(`Ran ${result.migrationsRun} migrations`);
  } else {
    console.error('Migration failed:', result.errors);
  }
}
```

## Security Considerations

1. Authentication
   - All admin endpoints require authentication
   - Use proper JWT validation
   - Implement rate limiting

2. Authorization
   - Verify user permissions
   - Implement role-based access
   - Log access attempts

3. Data Validation
   - Validate all input parameters
   - Sanitize response data
   - Implement request size limits

4. Error Handling
   - Don't expose internal errors
   - Log all errors properly
   - Return appropriate status codes 
