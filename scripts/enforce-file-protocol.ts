#!/usr/bin/env node

/**
 * Enforce File Protocol for Prisma
 *
 * This script runs before the application starts to ensure that all Prisma
 * client instances use the file: protocol consistently. It patches environment
 * variables and creates necessary configuration files.
 */

import fs from "fs";
import os from "os";
import path from "path";

console.log("Starting File Protocol Enforcement...");

// 1. Set environment variables
process.env.PRISMA_ACCELERATE_DISABLED = "true";
process.env.DATABASE_URL =
  process.env.DATABASE_URL?.replace(/^prisma:/, "file:") || "file:./data/app.db";
process.env.DIRECT_DATABASE_URL =
  process.env.DIRECT_DATABASE_URL?.replace(/^prisma:/, "file:") || "file:./data/app.db";

console.log(`Set DATABASE_URL to: ${process.env.DATABASE_URL}`);
console.log(`Set DIRECT_DATABASE_URL to: ${process.env.DIRECT_DATABASE_URL}`);

// 2. Create global Prisma configuration files
const homeDir = os.homedir();
const prismaRcPath = path.join(homeDir, ".prismarc");
const prismaConfigDir = path.join(homeDir, ".prisma");
const prismaConfigPath = path.join(prismaConfigDir, "config.json");

// Create .prismarc file in home directory
const prismaRcContent = JSON.stringify(
  {
    accelerate: { disabled: true },
    telemetry: { enabled: false },
  },
  null,
  2,
);

try {
  fs.writeFileSync(prismaRcPath, prismaRcContent);
  console.log(`Created/updated ${prismaRcPath}`);
} catch (error) {
  console.error(`Error creating ${prismaRcPath}:`, error);
}

// Create global Prisma config file
try {
  if (!fs.existsSync(prismaConfigDir)) {
    fs.mkdirSync(prismaConfigDir, { recursive: true });
  }

  fs.writeFileSync(prismaConfigPath, prismaRcContent);
  console.log(`Created/updated ${prismaConfigPath}`);
} catch (error) {
  console.error(`Error creating ${prismaConfigPath}:`, error);
}

// 3. Create .npmrc file with Prisma settings
try {
  const npmrcPath = path.join(process.cwd(), ".npmrc");
  const npmrcContent = "prisma-accelerate-disabled=true\nprisma-telemetry-disabled=1\n";
  fs.writeFileSync(npmrcPath, npmrcContent);
  console.log(`Created/updated ${npmrcPath}`);
} catch (error) {
  console.error(`Error creating .npmrc:`, error);
}

// 4. Patch schema.prisma file if needed
const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf8");

  // Make sure the URL uses file: protocol
  const urlPattern = /url\s*=\s*"[^"]*"/g;
  const matches = schemaContent.match(urlPattern);

  if (matches) {
    let modified = false;

    for (const match of matches) {
      if (match.includes("prisma://")) {
        const newMatch = match.replace(/prisma:\/\//, "file://");
        schemaContent = schemaContent.replace(match, newMatch);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(schemaPath, schemaContent);
      console.log(`Updated schema.prisma file to use file: protocol`);
    } else {
      console.log(`Schema file already using file: protocol`);
    }
  }
}

// 5. Create/update environment files
const envPath = path.join(process.cwd(), ".env");
const envLocalPath = path.join(process.cwd(), ".env.local");

// Standard .env file content
const envContent = `# Database Configuration
DATABASE_URL=file:./data/app.db
DIRECT_DATABASE_URL=file:./data/app.db
DATABASE_BACKUP_DIR=./data/backups

# Disable Prisma Accelerate
PRISMA_ACCELERATE_DISABLED=true
PRISMA_TELEMETRY_DISABLED=1
`;

// Priority override for .env.local
const envLocalContent = `# Priority overrides for database settings
DATABASE_URL=file:./data/app.db
DIRECT_DATABASE_URL=file:./data/app.db
PRISMA_ACCELERATE_DISABLED=true
`;

try {
  // Only update files if they don't exist or don't have the required settings
  if (
    !fs.existsSync(envPath) ||
    !fs.readFileSync(envPath, "utf8").includes("PRISMA_ACCELERATE_DISABLED=true")
  ) {
    fs.writeFileSync(envPath, envContent);
    console.log(`Created/updated ${envPath}`);
  }

  // Always create/update .env.local for priority overrides
  fs.writeFileSync(envLocalPath, envLocalContent);
  console.log(`Created/updated ${envLocalPath}`);
} catch (error) {
  console.error(`Error updating environment files:`, error);
}

console.log("File Protocol Enforcement completed successfully");
