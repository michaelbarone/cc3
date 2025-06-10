#!/usr/bin/env node

/**
 * Force Update Environment Script
 *
 * This script force updates all environment settings to disable Prisma Accelerate
 * and ensure all database URLs use the file: protocol.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

console.log("Starting Force Environment Update...");

// Default values
const DEFAULT_DB_URL = "file:./data/app.db";
const DEFAULT_BACKUP_DIR = "./data/backups";

// 1. Create .npmrc file
const npmrcPath = path.join(process.cwd(), ".npmrc");
const npmrcContent = `# Disable Prisma Accelerate
prisma-accelerate-disabled=true

# Disable Prisma telemetry
prisma-telemetry-disabled=1
`;

fs.writeFileSync(npmrcPath, npmrcContent);
console.log("Created .npmrc file with Prisma settings");

// 2. Create .prismarc file in project root
const prismaRcPath = path.join(process.cwd(), ".prismarc");
const prismaRcContent = JSON.stringify(
  {
    accelerate: {
      disabled: true,
    },
    telemetry: {
      enabled: false,
    },
  },
  null,
  2,
);

fs.writeFileSync(prismaRcPath, prismaRcContent);
console.log("Created .prismarc file in project root");

// 3. Create .prismarc file in user's home directory
const homePrismaRcPath = path.join(os.homedir(), ".prismarc");
fs.writeFileSync(homePrismaRcPath, prismaRcContent);
console.log(`Created .prismarc file in user's home directory: ${homePrismaRcPath}`);

// 4. Create global Prisma config in .prisma/config.json
const globalPrismaPath = path.join(os.homedir(), ".prisma", "config.json");
const globalPrismaDir = path.dirname(globalPrismaPath);

if (!fs.existsSync(globalPrismaDir)) {
  fs.mkdirSync(globalPrismaDir, { recursive: true });
}

fs.writeFileSync(
  globalPrismaPath,
  JSON.stringify(
    {
      telemetry: {
        enabled: false,
      },
      accelerate: {
        disabled: true,
      },
    },
    null,
    2,
  ),
);
console.log(`Created global Prisma config at ${globalPrismaPath}`);

// 5. Directly set environment variables
process.env.PRISMA_ACCELERATE_DISABLED = "true";
process.env.DATABASE_URL = DEFAULT_DB_URL;
process.env.DIRECT_DATABASE_URL = DEFAULT_DB_URL;
process.env.DATABASE_BACKUP_DIR = DEFAULT_BACKUP_DIR;
process.env.PRISMA_TELEMETRY_DISABLED = "1";

console.log("Set environment variables:");
console.log(`- PRISMA_ACCELERATE_DISABLED=${process.env.PRISMA_ACCELERATE_DISABLED}`);
console.log(`- DATABASE_URL=${process.env.DATABASE_URL}`);
console.log(`- DIRECT_DATABASE_URL=${process.env.DIRECT_DATABASE_URL}`);
console.log(`- DATABASE_BACKUP_DIR=${process.env.DATABASE_BACKUP_DIR}`);
console.log(`- PRISMA_TELEMETRY_DISABLED=${process.env.PRISMA_TELEMETRY_DISABLED}`);

// 6. Create a temporary .env.tmp file with correct settings
const envTmpPath = path.join(process.cwd(), ".env.tmp");
const envTmpContent = `# Database Configuration
DATABASE_URL=${DEFAULT_DB_URL}
DIRECT_DATABASE_URL=${DEFAULT_DB_URL}
DATABASE_BACKUP_DIR=${DEFAULT_BACKUP_DIR}

# Explicitly disable Prisma Accelerate
PRISMA_ACCELERATE_DISABLED=true

# Application Configuration
NEXTAUTH_SECRET=
JWT_SECRET=

# Telemetry Settings
PRISMA_TELEMETRY_DISABLED=1
`;

fs.writeFileSync(envTmpPath, envTmpContent);
console.log("Created temporary .env.tmp file with correct settings");
console.log(`To apply these settings, run: copy .env.tmp .env`);

console.log("Environment force update completed");
