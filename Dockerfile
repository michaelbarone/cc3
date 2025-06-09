FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Remove prepare script to avoid issues with Docker build
RUN npm pkg delete scripts.prepare

# Install dependencies including dev dependencies for build
RUN npm ci --omit=dev --no-audit

# Copy source files
COPY . .

# Clean test files to reduce build size
RUN find . -name "*.test.*" -type f -delete && \
    find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -f vitest.config.ts && \
    rm -f vitest.setup.ts && \
    rm -f playwright.config.ts

# Generate Prisma client
RUN npx prisma generate

# Build application with production optimizations
ENV NODE_ENV=production
RUN npx next build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production
# Enable Node.js production optimizations
ENV NODE_OPTIONS='--max-old-space-size=256'

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Copy package file
COPY package.json package-lock.json* ./

# Remove prepare script to avoid issues with Docker build
RUN npm pkg delete scripts.prepare

# Install production dependencies
RUN npm ci --omit=dev --no-audit

# Copy public assets
COPY --from=builder /app/public ./public

# Set up .next directory with proper permissions
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy and set up health check script
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directories
RUN mkdir -p /app/data /app/data/backups && \
    chown -R nextjs:nodejs /app/data

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

USER nextjs

EXPOSE 3000
ENV PORT=3000

# Run script for database creation and server startup
ENTRYPOINT ["./docker-entrypoint.sh"]
