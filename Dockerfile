FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./
# Enable production optimizations and clean install
RUN npm ci --only=production --no-audit

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application with production optimizations
ENV NODE_ENV=production
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Enable Node.js production optimizations
ENV NODE_OPTIONS='--max-old-space-size=256 --optimize-for-size'

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set up .next directory with proper permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy and set up health check script
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

USER nextjs

EXPOSE 3000
ENV PORT 3000

# Run script for database creation and server startup
ENTRYPOINT ["./docker-entrypoint.sh"]
