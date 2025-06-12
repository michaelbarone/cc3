#!/bin/sh
set -e

echo "Running Next.js Prisma Protocol Fix..."

# 1. Run the JS script to fix compiled code
echo "Fixing compiled Next.js code..."
node ./scripts/fix-compiled.js

# 2. Fix any PrismaClient instantiations in compiled code
echo "Fixing PrismaClient instantiations in compiled code..."
find ./.next -type f -name "*.js" -exec sed -i 's/new PrismaClient(/new PrismaClient({datasources:{db:{url:"file:\.\/data\/app\.db"}}})/' {} \;

# 3. Update any database configuration references
echo "Updating database configuration references..."
find ./.next -type f -name "*.js" -exec sed -i 's/process\.env\.DATABASE_URL/("file:\.\/data\/app\.db")/' {} \;

echo "Next.js Prisma Protocol Fix completed"
