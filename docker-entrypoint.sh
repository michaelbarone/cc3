#!/bin/sh
set -e

echo "Starting container initialization..."

# Explicitly create all required directories
echo "Creating required directories..."
mkdir -p /app/data
mkdir -p /app/data/backups
mkdir -p /app/public/uploads
mkdir -p /app/public/icons
mkdir -p /app/public/avatars
mkdir -p /app/public/logos
mkdir -p /app/public/favicons

# First, run the environment setup scripts
# Run the setup-env.ts script if it exists
if [ -f "./scripts/setup-env.ts" ]; then
  echo "Running environment setup script..."
  npx tsx ./scripts/setup-env.ts
else
  # Fallback to JS version
  if [ -f "./scripts/setup-env.js" ]; then
    echo "Running JS environment setup script..."
    node ./scripts/setup-env.js
  else
    echo "Environment setup script not found, continuing with manual setup..."
  fi
fi

# Run our DB config validation
if [ -f "./scripts/test-db-config.ts" ]; then
  echo "Validating database configuration..."
  npx tsx ./scripts/test-db-config.ts
else
  echo "DB config validation script not found, continuing..."
fi

# Run the fix-accelerate.ts script if it exists
if [ -f "./scripts/fix-accelerate.ts" ]; then
  echo "Running Prisma Accelerate fix script..."
  DATABASE_URL="file:./data/app.db" DIRECT_DATABASE_URL="file:./data/app.db" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/fix-accelerate.ts
else
  # Fallback to JS version
  if [ -f "./scripts/fix-accelerate.js" ]; then
    echo "Running JS Prisma Accelerate fix script..."
    DATABASE_URL="file:./data/app.db" DIRECT_DATABASE_URL="file:./data/app.db" PRISMA_ACCELERATE_DISABLED=true node ./scripts/fix-accelerate.js
  else
    echo "Prisma Accelerate fix script not found, continuing..."
  fi
fi

# Run the schema-fix.ts script to directly update the schema.prisma file
if [ -f "./scripts/schema-fix.ts" ]; then
  echo "Running schema fix script..."
  DIRECT_DATABASE_URL="file:./data/app.db" DATABASE_URL="file:./data/app.db" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/schema-fix.ts
else
  # Fallback to JS version
  if [ -f "./scripts/schema-fix.js" ]; then
    echo "Running JS schema fix script..."
    DIRECT_DATABASE_URL="file:./data/app.db" DATABASE_URL="file:./data/app.db" PRISMA_ACCELERATE_DISABLED=true node ./scripts/schema-fix.js
  else
    echo "Schema fix script not found, continuing..."
  fi
fi

# Run the force-update-env.ts script if it exists (most reliable method)
if [ -f "./scripts/force-update-env.ts" ]; then
  echo "Running force environment update script..."
  npx tsx ./scripts/force-update-env.ts
  # Apply temp .env if it was created
  if [ -f "./.env.tmp" ]; then
    echo "Applying temporary .env file..."
    cp ./.env.tmp ./.env
  fi
fi

# Default values - using simplified approach with only file: protocol
DEFAULT_DB_URL="file:./data/app.db"
DEFAULT_BACKUP_DIR="./data/backups"

# Set up the environment variables
export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DEFAULT_DB_URL}"
export DATABASE_URL="$DIRECT_DATABASE_URL"  # Use the same URL for both
export DATABASE_BACKUP_DIR="${DATABASE_BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
export PRISMA_ACCELERATE_DISABLED=true

# Extract file path (without protocol)
DB_FILE_PATH=$(echo "$DIRECT_DATABASE_URL" | sed 's/^file://')

# Print environment information for debugging
echo "======== ENVIRONMENT INFO ========"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"
echo "DIRECT_DATABASE_URL: $DIRECT_DATABASE_URL"
echo "DATABASE_BACKUP_DIR: $DATABASE_BACKUP_DIR"
echo "File Path: $DB_FILE_PATH"
echo "Backup Directory: $DATABASE_BACKUP_DIR"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "=================================="

# Function to check database health
check_database() {
    if [ ! -f "$DB_FILE_PATH" ]; then
        echo "Database file not found at $DB_FILE_PATH. Creating new database..."
        return 1
    fi

    # Try to run a simple query to check database integrity
    if ! DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true echo "PRAGMA integrity_check;" | npx prisma db execute --stdin > /dev/null 2>&1; then
        echo "Database integrity check failed. Creating new database..."
        return 1
    fi

    return 0
}

# Function to backup database
backup_database() {
    if [ -f "$DB_FILE_PATH" ]; then
        echo "Creating database backup..."
        mkdir -p "$DATABASE_BACKUP_DIR"
        cp "$DB_FILE_PATH" "$DATABASE_BACKUP_DIR/app_$(date +%Y%m%d_%H%M%S).db"
        # Keep only last 5 backups
        ls -t "$DATABASE_BACKUP_DIR"/app_*.db | tail -n +6 | xargs -r rm
    fi
}

# Check database health and create backup if needed
if check_database; then
    echo "Database check passed"
    backup_database
else
    echo "Initializing new database..."
    # If database doesn't exist or is corrupted, we'll recreate it
    rm -f "$DB_FILE_PATH"
fi

# Make sure the schema file is correctly set up before generating client
echo "Ensuring schema file is correctly configured..."
if [ -f "./scripts/schema-fix.ts" ]; then
  DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" DATABASE_URL="$DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/schema-fix.ts
fi

# Generate Prisma client if needed
echo "Ensuring Prisma client is generated..."
DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true NODE_ENV=production npx prisma generate --schema=./prisma/schema.prisma --no-engine

# Verify schema file one last time before migrations
echo "Verifying schema file before migrations..."
if [ -f "./scripts/schema-fix.ts" ]; then
  DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" DATABASE_URL="$DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/schema-fix.ts
fi

# Run Prisma database migrations
echo "Running database migrations..."
DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true NODE_ENV=production npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check if we need to seed the database
if [ ! -f "/app/data/.seeded" ] || [ "$(DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true echo "SELECT COUNT(*) FROM User;" | npx prisma db execute --schema=./prisma/schema.prisma --stdin | grep -o '[0-9]*')" = "0" ]; then
    echo "Running database seed..."
    DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true NODE_ENV=production npx prisma db seed --schema=./prisma/schema.prisma || echo "Seeding may have failed due to existing data, continuing startup..."
    touch /app/data/.seeded
else
    echo "Database already seeded, skipping..."
fi

# Run the database configuration validation script if it exists
if [ -f "./scripts/validate-db-config.ts" ]; then
  echo "Running database configuration validation..."
  DATABASE_URL="$DIRECT_DATABASE_URL" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/validate-db-config.ts
fi

# Set the runtime DATABASE_URL for the application
echo "Set DATABASE_URL for operations: $DATABASE_URL"
echo "Set DIRECT_DATABASE_URL for operations: $DIRECT_DATABASE_URL"
echo "Disabled Prisma Accelerate: PRISMA_ACCELERATE_DISABLED=true"

# Run fix-accelerate one final time before starting the application
if [ -f "./scripts/fix-accelerate.ts" ]; then
    echo "Running final Prisma protocol fix before startup..."
    DATABASE_URL="file:./data/app.db" DIRECT_DATABASE_URL="file:./data/app.db" PRISMA_ACCELERATE_DISABLED=true npx tsx ./scripts/fix-accelerate.ts
fi

# Run our custom Prisma protocol fix script as a final measure
if [ -f "./scripts/fix-prisma-protocol.sh" ]; then
    echo "Running comprehensive Prisma protocol fix script..."
    chmod +x ./scripts/fix-prisma-protocol.sh
    ./scripts/fix-prisma-protocol.sh
fi

# Run our fix for Next.js compiled code
if [ -f "./scripts/fix-nextjs-prisma.sh" ]; then
    echo "Running Next.js compiled code fix..."
    chmod +x ./scripts/fix-nextjs-prisma.sh
    ./scripts/fix-nextjs-prisma.sh
else
    # Fallback direct replacement
    echo "Running direct replacement of prisma:// with file: in compiled code..."
    find ./.next -type f -name "*.js" -exec sed -i 's/prisma:\/\//file:/g' {} \; 2>/dev/null || true
    find ./node_modules/.prisma -type f -name "*.js" -exec sed -i 's/prisma:\/\//file:/g' {} \; 2>/dev/null || true
    # Also fix PrismaClient instantiations
    find ./.next -type f -name "*.js" -exec sed -i 's/new PrismaClient(/new PrismaClient({datasources:{db:{url:"file:\.\/data\/app\.db"}}})/' {} \; 2>/dev/null || true
fi

# Run the database URL fix script if it exists
if [ -f "./scripts/fix-database-urls.js" ]; then
    echo "Running database URL fix script..."
    node ./scripts/fix-database-urls.js
fi

# Set environment variables explicitly before starting
export DATABASE_URL="file:./data/app.db"
export DIRECT_DATABASE_URL="file:./data/app.db"
export PRISMA_ACCELERATE_DISABLED="true"
export PRISMA_CLIENT_ENGINE_TYPE="binary"

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
