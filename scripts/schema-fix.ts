#!/usr/bin/env node

/**
 * Schema Fix Script
 *
 * This script directly modifies the schema.prisma file to ensure it uses the correct
 * database URL protocol.
 */

import * as fs from "fs";
import * as path from "path";

console.log("Starting Schema Fix Script...");

// Path to schema.prisma file
const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at ${schemaPath}`);
  process.exit(1);
}

// Read the schema file
let schemaContent = fs.readFileSync(schemaPath, "utf8");

// Default database URL with file: protocol
const defaultDbUrl = "file:./data/app.db";

// Get environment variables with fallbacks
const dbUrl = process.env.DATABASE_URL || defaultDbUrl;
const directDbUrl = process.env.DIRECT_DATABASE_URL || defaultDbUrl;

// Ensure both URLs use file: protocol
const fixedDbUrl = dbUrl.startsWith("prisma:") ? dbUrl.replace(/^prisma:/, "file:") : dbUrl;
const fixedDirectDbUrl = directDbUrl.startsWith("prisma:")
  ? directDbUrl.replace(/^prisma:/, "file:")
  : directDbUrl;

// Find the datasource section in the schema using a simple regex without the /s flag
// We'll use [\s\S]* instead of . to match across newlines
const datasourceMatch = schemaContent.match(/datasource db {[\s\S]*?}/);
const originalDatasourceSection = datasourceMatch ? datasourceMatch[0] : "";

const updatedDatasourceSection = `datasource db {
  provider = "sqlite"
  url      = "${fixedDirectDbUrl}"
}`;

if (originalDatasourceSection) {
  schemaContent = schemaContent.replace(originalDatasourceSection, updatedDatasourceSection);

  // Write the updated schema back to file
  fs.writeFileSync(schemaPath, schemaContent);
  console.log(`Updated schema.prisma with direct URL: ${fixedDirectDbUrl}`);
} else {
  console.error("Could not locate datasource section in schema.prisma");
}

// Now update the database config variables to ensure consistency
process.env.DATABASE_URL = fixedDirectDbUrl;
process.env.DIRECT_DATABASE_URL = fixedDirectDbUrl;
process.env.PRISMA_ACCELERATE_DISABLED = "true";

console.log("Environment variables set:");
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`- DIRECT_DATABASE_URL: ${process.env.DIRECT_DATABASE_URL}`);
console.log(`- PRISMA_ACCELERATE_DISABLED: ${process.env.PRISMA_ACCELERATE_DISABLED}`);

console.log("Schema Fix Script completed");
