#!/bin/sh

# Run Prisma database migrations (in case it's needed)
npx prisma migrate deploy

# Start the Next.js server
exec node server.js
