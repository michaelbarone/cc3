#!/bin/sh
set -e

# Print environment information for debugging
echo "======== ENVIRONMENT INFO ========"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"
echo "DATABASE_BACKUP_DIR: $DATABASE_BACKUP_DIR"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "=================================="

# Create data directory if it doesn't exist
mkdir -p /app/data
mkdir -p /app/data/backups

# Store the original DATABASE_URL
ORIGINAL_DATABASE_URL="$DATABASE_URL"

# For Prisma CLI operations, we need the file: format
# Strip prisma:// prefix if it exists
CLI_DATABASE_URL="$DATABASE_URL"
if echo "$CLI_DATABASE_URL" | grep -q "^prisma://"; then
    CLI_DATABASE_URL=$(echo "$CLI_DATABASE_URL" | sed 's/^prisma:\/\///')
    echo "Modified DATABASE_URL for CLI operations: $CLI_DATABASE_URL"
fi

# Function to check database health
check_database() {
    if [ ! -f "/app/data/app.db" ]; then
        echo "Database file not found. Creating new database..."
        return 1
    fi

    # Try to run a simple query to check database integrity
    if ! DATABASE_URL="$CLI_DATABASE_URL" echo "PRAGMA integrity_check;" | npx prisma db execute --stdin > /dev/null 2>&1; then
        echo "Database integrity check failed. Creating new database..."
        return 1
    fi

    return 0
}

# Function to backup database
backup_database() {
    if [ -f "/app/data/app.db" ]; then
        echo "Creating database backup..."
        cp /app/data/app.db "/app/data/backups/app_$(date +%Y%m%d_%H%M%S).db"
        # Keep only last 5 backups
        ls -t /app/data/backups/app_*.db | tail -n +6 | xargs -r rm
    fi
}

# Check database health and create backup if needed
if check_database; then
    echo "Database check passed"
    backup_database
else
    echo "Initializing new database..."
    # If database doesn't exist or is corrupted, we'll recreate it
    rm -f /app/data/app.db
fi

# Generate Prisma client if needed
echo "Ensuring Prisma client is generated..."
DATABASE_URL="$CLI_DATABASE_URL" NODE_ENV=production npx prisma generate --schema=./prisma/schema.prisma --no-engine

# Run Prisma database migrations
echo "Running database migrations..."
DATABASE_URL="$CLI_DATABASE_URL" NODE_ENV=production npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check if we need to seed the database
if [ ! -f "/app/data/.seeded" ] || [ "$(DATABASE_URL="$CLI_DATABASE_URL" echo "SELECT COUNT(*) FROM User;" | npx prisma db execute --schema=./prisma/schema.prisma --stdin | grep -o '[0-9]*')" = "0" ]; then
    echo "Running database seed..."
    DATABASE_URL="$CLI_DATABASE_URL" NODE_ENV=production npx prisma db seed --schema=./prisma/schema.prisma || echo "Seeding may have failed due to existing data, continuing startup..."
    touch /app/data/.seeded
else
    echo "Database already seeded, skipping..."
fi

# Restore the original DATABASE_URL for runtime
export DATABASE_URL="$ORIGINAL_DATABASE_URL"
echo "Restored DATABASE_URL for runtime: $DATABASE_URL"

# Start the Next.js server
echo "Starting Next.js server..."
# Check if server.js exists and use it directly if it does
if [ -f "server.js" ]; then
    echo "Found server.js, starting with node..."
    exec node server.js
else
    # Fallback to npm start
    echo "No server.js found, using npm start..."
    exec npm run start
fi