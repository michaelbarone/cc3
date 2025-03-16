#!/bin/sh
set -e

# Create data directory if it doesn't exist
mkdir -p /app/data
mkdir -p /app/backup

# Function to check database health
check_database() {
    if [ ! -f "/app/data/sqlite.db" ]; then
        echo "Database file not found. Creating new database..."
        return 1
    fi

    # Try to run a simple query to check database integrity
    if ! npx prisma db execute --stdin <<< "PRAGMA integrity_check;" > /dev/null 2>&1; then
        echo "Database integrity check failed. Creating new database..."
        return 1
    fi

    return 0
}

# Function to backup database
backup_database() {
    if [ -f "/app/data/sqlite.db" ]; then
        echo "Creating database backup..."
        cp /app/data/sqlite.db "/app/backup/sqlite_$(date +%Y%m%d_%H%M%S).db"
        # Keep only last 5 backups
        ls -t /app/backup/sqlite_*.db | tail -n +6 | xargs -r rm
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
npx prisma migrate deploy

# Run the database seed script if needed
echo "Running database seed..."
npx prisma db seed

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
