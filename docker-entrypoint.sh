#!/bin/sh
set -e

# Create data directory if it doesn't exist
mkdir -p /data
mkdir -p /data/backups

# Set Docker container flag for constants.ts to detect
export DOCKER_CONTAINER=true

# Define the standardized database path
DB_PATH="/data/app.db"
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
        cp "${DB_PATH}" "/data/backups/app_$(date +%Y%m%d_%H%M%S).db"
        # Keep only last 5 backups
        ls -t /data/backups/app_*.db | tail -n +6 | xargs -r rm
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
# Use the hardcoded database path with more verbose output
if DATABASE_URL="${DB_URL}" NODE_ENV=production npx tsx prisma/seed.ts; then
    echo "Database seed completed successfully."
else
    echo "Warning: Database seed script failed with exit code $?"
    echo "This might be normal if the database was already seeded."
    echo "Check logs above for specific errors if this is unexpected."
fi

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
