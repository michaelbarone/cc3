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

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Set environment variable to skip seeding during build
ENV SKIP_SEED=true

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application with production optimizations
ENV NODE_ENV=production
RUN npx next build

# Production image
FROM base AS runner

# WORKDIR /app

ENV NODE_ENV=production
# Hardcoded standardized database path
ENV DATABASE_URL=file:/data/app.db
# Set to false in runner to enable seeding when container starts
ENV SKIP_SEED=false

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Create data directories
RUN mkdir -p ./data ./data/backups

# Create other directories
RUN mkdir -p ./public/uploads
RUN mkdir -p ./public/icons
RUN mkdir -p ./public/avatars
RUN mkdir -p ./public/logos

# Add healthcheck
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    # CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
ENV PORT=3000

# Run script for database creation and server startup
ENTRYPOINT ["./docker-entrypoint.sh"]
