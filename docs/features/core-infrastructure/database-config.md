# Database Configuration

## Overview

This document outlines the centralized database path handling system implemented to resolve inconsistencies between `prisma://` and `file:` URL formats across the application.

## Key Components

### Database Configuration Module

Located at `app/lib/db/database-config.ts`, this module provides:

- Standard database paths for different environments
- Conversion utilities between URL formats
- Consistent access patterns for database operations
- Environment-specific configuration

### Usage

```typescript
import { DB_CONFIG, DATABASE_URL, DATABASE_CLI_URL } from "@/app/lib/db/database-config";

// Runtime URL (for Prisma client)
console.log(DB_CONFIG.runtimeUrl); // prisma://./path/to/db.sqlite

// CLI URL (for Prisma CLI operations)
console.log(DB_CONFIG.cliUrl); // file:./path/to/db.sqlite

// File path (no protocol)
console.log(DB_CONFIG.filePath); // ./path/to/db.sqlite

// Convert between formats
const runtimeUrl = DB_CONFIG.toRuntimeUrl("file:./test.db"); // prisma://./test.db
const cliUrl = DB_CONFIG.toCliUrl("prisma://./test.db"); // file:./test.db
const filePath = DB_CONFIG.toFilePath("prisma://./test.db"); // ./test.db
```

## URL Formats

| Format | Purpose | Example |
|--------|---------|---------|
| `prisma://` | Runtime database operations | `prisma://./data/app.db` |
| `file:` | CLI operations and migrations | `file:./data/app.db` |
| Raw Path | File system operations | `./data/app.db` |

## Environment Variables

All environment variables are now optional, as the system provides consistent defaults across environments:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Primary database connection URL (optional) | `./data/app.db` (all environments) |
| `DIRECT_DATABASE_URL` | Direct connection URL (optional) | Same as CLI URL |
| `DATABASE_BACKUP_DIR` | Directory for database backups (optional) | `./data/backups` |

**Note:** With the latest updates, the database path is consistent across all environments, and `DATABASE_URL` is no longer a required environment variable. It's only needed when you want to override the default database location.

## Integration Points

The following components have been updated to use the centralized configuration:

1. **Prisma Client** (`app/lib/db/prisma.ts`)
   - Uses the runtime URL format for database operations
   - Includes proper error handling and proxy for operational safety

2. **Archive Module** (`app/lib/archive/archive.ts`)
   - Uses the file path format for file system operations
   - Handles backup and restore operations with the standardized paths

3. **Database Initialization** (`app/lib/db/init.ts`)
   - Creates necessary directories based on configuration
   - Runs migrations with CLI-compatible URL format

4. **Test Database Client** (`test/mocks/services/prisma/test-db-client.ts`)
   - Uses test-specific database configuration
   - Maintains consistent URL formats for test operations

5. **Docker Entrypoint** (`docker-entrypoint.sh`)
   - Converts between URL formats for CLI operations
   - Maintains proper environment variables for runtime

## Benefits

- **Consistency**: Standardized URL handling across the application
- **Clarity**: Clear separation between runtime and CLI operations
- **Configurability**: Environment-specific defaults with override capability
- **Testability**: Easier mocking and testing of database operations
- **Maintainability**: Centralized configuration reduces code duplication

## Testing

The database configuration includes comprehensive tests in `app/lib/db/database-config.test.ts` that verify:

- URL format conversions
- Default URL configurations
- Directory structure handling
- Environment variable handling

## Best Practices

1. **Always import from the configuration module**:
   ```typescript
   import { DB_CONFIG } from "@/app/lib/db/database-config";
   ```

2. **Use the appropriate URL format for the operation**:
   - Runtime operations: `DB_CONFIG.runtimeUrl`
   - CLI operations: `DB_CONFIG.cliUrl`
   - File system operations: `DB_CONFIG.filePath`

3. **Use conversion utilities when needed**:
   ```typescript
   const runtimeUrl = DB_CONFIG.toRuntimeUrl(someUrl);
   const cliUrl = DB_CONFIG.toCliUrl(someUrl);
   const filePath = DB_CONFIG.toFilePath(someUrl);
   ```

4. **Access via provider for initialized client**:
   ```typescript
   import { getPrismaClient, getDatabaseConfig } from "@/app/lib/db/provider";
   
   const prisma = await getPrismaClient();
   const dbConfig = getDatabaseConfig();
   ```

## Troubleshooting

If you encounter database connection issues:

1. Check that the URL format matches the operation type:
   - Runtime operations need `prisma://` prefix
   - CLI operations need `file:` prefix

2. Verify environment variables in relevant environments:
   - Development: Check `.env.development`
   - Production: Check Docker environment variables
   - Testing: Check test setup configuration

3. Check that directories exist and have proper permissions:
   - Database directory
   - Backup directory

4. Use the debugging tools in the database configuration:
   ```typescript
   console.log("Runtime URL:", DB_CONFIG.runtimeUrl);
   console.log("CLI URL:", DB_CONFIG.cliUrl);
   console.log("File Path:", DB_CONFIG.filePath);
   ``` 
