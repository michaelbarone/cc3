# URL Management API Documentation

## Base URL
All URLs referenced are relative to: `/api/admin`

## Authentication
All endpoints require authentication using JWT tokens.
Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### URL Management

#### List URLs
```http
GET /urls
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for URL title or address

Response:
```json
{
  "urls": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "urlMobile": "string?",
      "iconPath": "string?",
      "idleTimeoutMinutes": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### Create URL
```http
POST /urls
```

Request Body:
```json
{
  "title": "string",
  "url": "string",
  "urlMobile": "string?",
  "idleTimeoutMinutes": "number?"
}
```

Response:
```json
{
  "id": "string",
  "title": "string",
  "url": "string",
  "urlMobile": "string?",
  "iconPath": "string?",
  "idleTimeoutMinutes": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Update URL
```http
PUT /urls/:id
```

Request Body:
```json
{
  "title": "string?",
  "url": "string?",
  "urlMobile": "string?",
  "idleTimeoutMinutes": "number?"
}
```

Response:
```json
{
  "id": "string",
  "title": "string",
  "url": "string",
  "urlMobile": "string?",
  "iconPath": "string?",
  "idleTimeoutMinutes": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Delete URL
```http
DELETE /urls/:id
```

Response: 204 No Content

### Group Management

#### List Groups
```http
GET /url-groups
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for group name

Response:
```json
{
  "groups": [
    {
      "id": "string",
      "name": "string",
      "description": "string?",
      "createdAt": "string",
      "updatedAt": "string",
      "urlCount": "number"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### Create Group
```http
POST /url-groups
```

Request Body:
```json
{
  "name": "string",
  "description": "string?"
}
```

Response:
```json
{
  "id": "string",
  "name": "string",
  "description": "string?",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Update Group
```http
PUT /url-groups/:id
```

Request Body:
```json
{
  "name": "string?",
  "description": "string?"
}
```

Response:
```json
{
  "id": "string",
  "name": "string",
  "description": "string?",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Delete Group
```http
DELETE /url-groups/:id
```

Response: 204 No Content

### URL-Group Relationships

#### List URLs in Group
```http
GET /url-groups/:id/urls
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

Response:
```json
{
  "urls": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "urlMobile": "string?",
      "iconPath": "string?",
      "idleTimeoutMinutes": "number",
      "displayOrder": "number",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

#### Add URL to Group
```http
POST /url-groups/:id/urls
```

Request Body:
```json
{
  "urlId": "string",
  "displayOrder": "number?"
}
```

Response:
```json
{
  "urlId": "string",
  "groupId": "string",
  "displayOrder": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Update URL in Group
```http
PUT /url-groups/:groupId/urls/:urlId
```

Request Body:
```json
{
  "displayOrder": "number"
}
```

Response:
```json
{
  "urlId": "string",
  "groupId": "string",
  "displayOrder": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Remove URL from Group
```http
DELETE /url-groups/:groupId/urls/:urlId
```

Response: 204 No Content

### Batch Operations

#### Batch Add URLs to Group
```http
POST /url-groups/:id/urls/batch
```

Request Body:
```json
{
  "operation": "add",
  "urls": [
    {
      "urlId": "string",
      "displayOrder": "number?"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "added": "number"
}
```

#### Batch Remove URLs from Group
```http
POST /url-groups/:id/urls/batch
```

Request Body:
```json
{
  "operation": "remove",
  "urlIds": ["string"]
}
```

Response:
```json
{
  "success": true,
  "removed": "number"
}
```

#### Batch Reorder URLs in Group
```http
POST /url-groups/:id/urls/batch
```

Request Body:
```json
{
  "operation": "reorder",
  "orders": [
    {
      "urlId": "string",
      "displayOrder": "number"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "updated": "number"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid request parameters",
  "details": {
    "field": ["error message"]
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

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- Rate limit: 100 requests per minute per IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time until window reset (Unix timestamp)

## Pagination

All list endpoints support pagination with the following parameters:
- `page`: Page number (1-based)
- `limit`: Items per page (default: 10, max: 100)

Response includes:
- `total`: Total number of items
- `page`: Current page number
- `limit`: Items per page
- `data`: Array of items for current page

## Filtering and Sorting

### Common Query Parameters
- `search`: Search term for text fields
- `sortBy`: Field to sort by
- `sortOrder`: Sort direction ('asc' or 'desc')
- `startDate`: Filter by creation date range start
- `endDate`: Filter by creation date range end

## Versioning

Current API version: v1
Include version in Accept header:
```
Accept: application/json; version=1
```
