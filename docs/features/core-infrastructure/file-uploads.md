# File Upload and Serving

## Overview

This document explains the approach for handling file uploads and serving uploaded files in the application, particularly in production environments where Next.js doesn't automatically serve dynamically uploaded files from the public directory.

## Problem Statement

Next.js doesn't serve files that are dynamically added to the public directory after build time, especially in production environments like Docker containers. This creates a challenge for user-uploaded content that needs to be stored and served from the application.

## Solution

We've implemented a custom API route (`/api/public/*`) that serves files from the public directory. This approach allows us to:

1. Save uploaded files to the public directory
2. Serve these files through a custom API endpoint
3. Maintain proper content types and caching headers
4. Control access to files if needed in the future

## Implementation Details

### File Structure

- **Physical Storage**: Files are stored in subdirectories under `/public/`:
  - `/public/icons/` - URL icons
  - `/public/avatars/` - User avatars
  - `/public/logos/` - App logos
  - `/public/uploads/` - General uploads
  - `/public/favicons/` - Favicons

- **API Access**: Files are served through the `/api/public/` route:
  - `/api/public/icons/` - Access URL icons
  - `/api/public/avatars/` - Access user avatars
  - `/api/public/logos/` - Access app logos
  - `/api/public/uploads/` - Access general uploads
  - `/api/public/favicons/` - Access favicons

### Key Components

1. **File Path Constants**: `app/lib/utils/file-paths.ts`
   - Centralizes all file path definitions
   - Provides utility functions for path conversion
   - Maintains backward compatibility with legacy paths

2. **Public API Route**: `app/api/public/route.ts`
   - Serves files from the public directory
   - Sets appropriate content types
   - Configures caching headers
   - Handles errors gracefully

3. **Middleware Configuration**: `middleware.ts`
   - Allows public access to `/api/public/*` paths
   - Ensures uploaded files are accessible without authentication

4. **Upload Handlers**: Various API routes for file uploads
   - Save files to the appropriate public subdirectory
   - Return API paths for database storage
   - Handle file processing (resizing, format conversion)

### Usage

#### Storing File Paths

When storing file paths in the database, always use the API path format:

```typescript
// Good - API path format
const iconUrl = `${STORAGE_PATHS.API.ICONS}/${filename}`;
// e.g., "/api/public/icons/icon-123456.webp"

// Bad - Legacy path format
const iconUrl = `/icons/${filename}`;
// e.g., "/icons/icon-123456.webp"
```

#### Displaying Images

When displaying images, use the stored API path directly:

```tsx
<img src={iconUrl} alt="Icon" />
// Where iconUrl is "/api/public/icons/icon-123456.webp"
```

#### Converting Legacy Paths

For backward compatibility, use the `convertToApiPath` utility:

```typescript
import { convertToApiPath } from "@/app/lib/utils/file-paths";

// Convert legacy path to API path
const apiPath = convertToApiPath(legacyPath);
// e.g., "/icons/icon-123456.webp" → "/api/public/icons/icon-123456.webp"
```

## Security Considerations

- The `/api/public/*` routes are publicly accessible without authentication
- File access control should be implemented at the upload level
- Consider adding authentication for sensitive files if needed in the future

## Caching

Files served through the `/api/public/*` route include caching headers:

```
Cache-Control: public, max-age=31536000
```

This sets a 1-year cache duration for static assets, improving performance for frequently accessed files.

## Future Improvements

1. **Content Delivery Network (CDN)**: Consider moving file storage to a CDN for improved performance
2. **Access Control**: Implement file-level access control for sensitive uploads
3. **Storage Optimization**: Add automatic cleanup of unused files
4. **Image Processing**: Enhance image processing with additional formats and sizes 
