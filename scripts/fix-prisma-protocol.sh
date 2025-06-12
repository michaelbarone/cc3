#!/bin/sh
set -e

echo "Running Prisma Protocol Fix Script..."

# 1. Set environment variables
export PRISMA_ACCELERATE_DISABLED=true
export PRISMA_TELEMETRY_DISABLED=1
export PRISMA_CLIENT_ENGINE_TYPE=binary
export DATABASE_URL="file:./data/app.db"
export DIRECT_DATABASE_URL="file:./data/app.db"

# 2. Create Prisma configuration files
mkdir -p /root/.prisma
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prisma/config.json
echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prismarc
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
fi

# 5. Create a custom .env.local with required overrides
cat > ./.env.local << EOL
# Force direct connection
DATABASE_URL=file:./data/app.db
DIRECT_DATABASE_URL=file:./data/app.db
PRISMA_ACCELERATE_DISABLED=true
PRISMA_TELEMETRY_DISABLED=1
PRISMA_CLIENT_ENGINE_TYPE=binary
EOL

# 6. Check and fix any generated client
if [ -d "./node_modules/.prisma" ]; then
  find ./node_modules/.prisma -type f -name "*.js" -exec sed -i 's|prisma://|file:|g' {} \;
  echo "Fixed Prisma client protocol references"
fi

echo "Prisma Protocol Fix completed"
