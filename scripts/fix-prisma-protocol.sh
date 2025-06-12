#!/bin/sh
set -e

echo "Running Prisma Protocol Fix Script..."

# 1. Update schema.prisma directly to use file: protocol
if [ -f "./prisma/schema.prisma" ]; then
  # Replace URL configuration
  sed -i 's/url *= *env(".*")/url      = "file:\.\/data\/app.db"/' ./prisma/schema.prisma
  # Ensure previewFeatures is empty
  sed -i 's/previewFeatures = \[.*\]/previewFeatures = []/' ./prisma/schema.prisma
  # Add engineType if not present
  if ! grep -q "engineType" ./prisma/schema.prisma; then
    sed -i '/provider *= *"prisma-client-js"/a\  engineType      = "binary"' ./prisma/schema.prisma
  fi

  # Display updated schema
  echo "Updated schema.prisma to use file: protocol"
  cat ./prisma/schema.prisma
fi

# 2. Search and replace in compiled code
find ./.next -type f -name "*.js" -exec sed -i 's/prisma:\/\//file:/g' {} \; 2>/dev/null || true
find ./node_modules/.prisma -type f -name "*.js" -exec sed -i 's/prisma:\/\//file:/g' {} \; 2>/dev/null || true

# 3. Set environment variables
export DATABASE_URL="file:./data/app.db"
export DIRECT_DATABASE_URL="file:./data/app.db"
export PRISMA_ACCELERATE_DISABLED=true
export PRISMA_CLIENT_ENGINE_TYPE=binary

# 4. Create global Prisma config files
mkdir -p /root/.prisma
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prisma/config.json
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prismarc
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > ./.prismarc

# 5. Create .npmrc file
echo "prisma-accelerate-disabled=true" > ./.npmrc
echo "prisma-telemetry-disabled=1" >> ./.npmrc

# 6. Fix any PrismaClient instantiations in compiled code
find ./.next -type f -name "*.js" -exec sed -i 's/new PrismaClient(/new PrismaClient({datasources:{db:{url:"file:\.\/data\/app\.db"}}})/' {} \; 2>/dev/null || true

# 7. Create fixed .env file
cat > ./.env << EOL
DATABASE_URL=file:./data/app.db
DIRECT_DATABASE_URL=file:./data/app.db
PRISMA_ACCELERATE_DISABLED=true
PRISMA_CLIENT_ENGINE_TYPE=binary
PRISMA_TELEMETRY_DISABLED=1
EOL

echo "Prisma Protocol Fix completed"
