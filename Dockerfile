FROM node:20.10-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare
RUN npm ci

FROM base AS dev

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set consistent database configuration - simplified approach
ENV NODE_ENV=development
ENV DATABASE_URL=file:./data/app.db
ENV DIRECT_DATABASE_URL=file:./data/app.db
ENV DATABASE_BACKUP_DIR=./data/backups
ENV PRISMA_ACCELERATE_DISABLED=true
ENV PRISMA_TELEMETRY_DISABLED=1

# Uncomment this if you're using prisma, generates prisma files for linting
RUN npx prisma generate

#Enables Hot Reloading Check https://github.com/vercel/next.js/issues/36774 for more information
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.npm /root/.npm
COPY . .

# Set consistent database configuration - simplified approach
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/app.db
ENV DIRECT_DATABASE_URL=file:./data/app.db
ENV DATABASE_BACKUP_DIR=./data/backups
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_ACCELERATE_DISABLED=true
ENV PRISMA_TELEMETRY_DISABLED=1

# Clean test files to reduce build size
RUN find . -name "*.test.*" -type f -delete && \
    find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf test

RUN rm playwright.config.ts
RUN rm vitest.config.ts
RUN rm vitest.setup.ts

# Create global Prisma configuration to disable Accelerate
RUN mkdir -p /root/.prisma && \
    echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prisma/config.json && \
    echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prismarc

# Directly update the schema.prisma file to use file: protocol without env variables
RUN sed -i 's/url *= *env(".*")/url      = "file:\/\/\/app\/data\/app.db"/' ./prisma/schema.prisma && \
    cat ./prisma/schema.prisma

# Generate Prisma client without running migrations
RUN npx prisma generate

# Run next build without Prisma migrations
RUN npx next build --experimental-build-mode compile

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set consistent database configuration - simplified approach
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/app.db
ENV DIRECT_DATABASE_URL=file:./data/app.db
ENV DATABASE_BACKUP_DIR=./data/backups
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_ACCELERATE_DISABLED=true
ENV PRISMA_TELEMETRY_DISABLED=1

# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
# RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy app directory for proper imports
COPY --from=builder /app/app ./app

# Copy prisma and scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Ensure node_modules are properly copied
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create global Prisma configuration to disable Accelerate
RUN mkdir -p /root/.prisma && \
    echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prisma/config.json && \
    echo '{"accelerate":{"disabled":true},"telemetry":{"enabled":false}}' > /root/.prismarc

# Create data directories
RUN mkdir -p ./data/backups
RUN mkdir -p ./public/uploads
RUN mkdir -p ./public/icons
RUN mkdir -p ./public/avatars
RUN mkdir -p ./public/logos
RUN mkdir -p ./public/favicons

# Directly update the schema.prisma file again to ensure consistency
RUN sed -i 's/url *= *env(".*")/url      = "file:\.\/data\/app.db"/' ./prisma/schema.prisma && \
    cat ./prisma/schema.prisma

# Copy the entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
# RUN chown nextjs:nodejs ./docker-entrypoint.sh

# USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
