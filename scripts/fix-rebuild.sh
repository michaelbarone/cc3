#!/bin/sh
set -e

echo "Running Full Rebuild Script..."

# 1. Set environment variables
export PRISMA_ACCELERATE_DISABLED=true
export PRISMA_TELEMETRY_DISABLED=1
export PRISMA_CLIENT_ENGINE_TYPE=binary
export DATABASE_URL="file:./data/app.db"
export DIRECT_DATABASE_URL="file:./data/app.db"

# 2. Create Prisma configuration files
mkdir -p ~/.prisma
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > ~/.prisma/config.json
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > ~/.prismarc
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > ./.prismarc

# 3. Create .npmrc file
echo "prisma-accelerate-disabled=true" > ./.npmrc
echo "prisma-telemetry-disabled=1" >> ./.npmrc

# 4. Update schema.prisma to ensure it uses file: protocol
if [ -f "./prisma/schema.prisma" ]; then
  # Replace any url = env(...) with direct file: URL
  sed -i 's|url *= *env(".*")|url      = "file:./data/app.db"|g' ./prisma/schema.prisma
  # Ensure there's no prisma:// protocol anywhere in the file
  sed -i 's|prisma://|file:|g' ./prisma/schema.prisma
  echo "Updated schema.prisma to use file: protocol"
  cat ./prisma/schema.prisma
else
  echo "schema.prisma not found!"
  exit 1
fi

# 5. Clear node_modules/.prisma to force regeneration
echo "Clearing Prisma cache..."
rm -rf node_modules/.prisma

# 6. Remove existing build
echo "Removing existing Next.js build..."
rm -rf .next

# 7. Regenerate Prisma client
echo "Regenerating Prisma client..."
npx prisma generate

# 8. Rebuild Next.js application
echo "Rebuilding Next.js application..."
npm run build

echo "Full Rebuild completed"
