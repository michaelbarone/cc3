#!/bin/sh

# Run Prisma database migrations (in case it's needed)
npx prisma migrate deploy

# Run the database seed script to create admin user if needed
npx prisma db seed

# Start the Next.js server
exec node server.js
