#!/bin/sh
set -e

# Create data directory if it doesn't exist
mkdir -p /app/data
mkdir -p /app/data/backups

# Define the standardized database path
DB_PATH="/app/data/app.db"
DB_URL="file:${DB_PATH}"

# Function to check database health
check_database() {
    if [ ! -f "${DB_PATH}" ]; then
        echo "Database file not found. Creating new database..."
        return 1
    fi

    # Try to run a simple query to check database integrity
    if ! echo "PRAGMA integrity_check;" | npx prisma db execute --stdin > /dev/null 2>&1; then
        echo "Database integrity check failed. Creating new database..."
        return 1
    fi

    return 0
}

# Function to backup database
backup_database() {
    if [ -f "${DB_PATH}" ]; then
        echo "Creating database backup..."
        cp "${DB_PATH}" "/app/data/backups/app_$(date +%Y%m%d_%H%M%S).db"
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
fi

# Run Prisma database migrations
echo "Running database migrations..."
# Use the hardcoded database path
DATABASE_URL="${DB_URL}" npx prisma migrate deploy

# Run the database seed script if needed
echo "Running database seed..."
# Check if seeding should be skipped
if [ "$SKIP_SEED" = "true" ]; then
    echo "SKIP_SEED environment variable set to true. Skipping database seed."
else
    # Use the hardcoded database path with more verbose output
    if DATABASE_URL="${DB_URL}" NODE_ENV=production npx tsx prisma/seed.ts; then
        echo "Database seed completed successfully."
    else
        echo "Warning: Database seed script failed with exit code $?"
        echo "This might be normal if the database was already seeded."
        echo "Check logs above for specific errors if this is unexpected."
    fi
fi

# Check for public content in the case it gets overwritten on first mount
if [ ! -d "/app/public/logos/app-logo-default.png" ]; then
    echo "Copying public content from public-default..."
    cp -r /app/public-default/. /app/public
fi

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
