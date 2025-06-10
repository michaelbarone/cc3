#!/usr/bin/env node

/**
 * Database Configuration Validation
 *
 * This script validates that all database configurations are correct before
 * starting the application.
 */

import * as fs from "fs";
import * as path from "path";

console.log("Starting Database Configuration Validation...");

// Check environment variables
const checkEnvVars = () => {
  console.log("Checking environment variables...");

  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("DATABASE_URL is not set!");
    return false;
  }

  if (dbUrl.startsWith("prisma:")) {
    console.error(`DATABASE_URL is using prisma: protocol: ${dbUrl}`);
    return false;
  }

  if (!dbUrl.startsWith("file:")) {
    console.error(`DATABASE_URL is not using file: protocol: ${dbUrl}`);
    return false;
  }

  // Check DIRECT_DATABASE_URL
  const directDbUrl = process.env.DIRECT_DATABASE_URL || "";
  if (!directDbUrl) {
    console.error("DIRECT_DATABASE_URL is not set!");
    return false;
  }

  if (directDbUrl.startsWith("prisma:")) {
    console.error(`DIRECT_DATABASE_URL is using prisma: protocol: ${directDbUrl}`);
    return false;
  }

  if (!directDbUrl.startsWith("file:")) {
    console.error(`DIRECT_DATABASE_URL is not using file: protocol: ${directDbUrl}`);
    return false;
  }

  // Check PRISMA_ACCELERATE_DISABLED
  const accelerateDisabled = process.env.PRISMA_ACCELERATE_DISABLED;
  if (accelerateDisabled !== "true") {
    console.error(`PRISMA_ACCELERATE_DISABLED is not set to 'true': ${accelerateDisabled}`);
    return false;
  }

  console.log("Environment variables are correctly set!");
  return true;
};

// Check schema.prisma file
const checkSchemaPrisma = () => {
  console.log("Checking schema.prisma file...");

  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found at ${schemaPath}`);
    return false;
  }

  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  // Check datasource section
  const datasourceMatch = schemaContent.match(/datasource db {[\s\S]*?}/);
  if (!datasourceMatch) {
    console.error("Could not find datasource section in schema.prisma");
    return false;
  }

  const datasourceSection = datasourceMatch[0];

  // Check for prisma:// protocol
  if (datasourceSection.includes("prisma://")) {
    console.error("schema.prisma contains prisma:// protocol");
    return false;
  }

  // Check for file: protocol
  if (!datasourceSection.includes("file:")) {
    console.error("schema.prisma does not contain file: protocol");
    return false;
  }

  // Make sure it's not using env() for the URL
  if (datasourceSection.includes("env(")) {
    // Only warn if it's using env, but ensure it's using file: protocol
    const urlLine = datasourceSection.match(/url\s*=\s*[^,\n]*/)?.[0] || "";
    if (!urlLine.includes("file:")) {
      console.error("schema.prisma is using env() but not with file: protocol");
      return false;
    }
    console.warn("WARNING: schema.prisma is using env() - this is not recommended");
  }

  console.log("schema.prisma file is correctly configured!");
  return true;
};

// Check .prisma configuration
const checkPrismaConfig = () => {
  console.log("Checking Prisma configuration files...");

  const homeDir = process.env.HOME || "";
  if (!homeDir) {
    console.warn("Could not determine home directory");
    return true;
  }

  // Check global Prisma config
  const globalConfigPath = path.join(homeDir, ".prisma/config.json");
  if (fs.existsSync(globalConfigPath)) {
    try {
      const configContent = fs.readFileSync(globalConfigPath, "utf8");
      const config = JSON.parse(configContent);

      if (!config.accelerate?.disabled) {
        console.error("Global Prisma config does not have accelerate.disabled=true");
        return false;
      }
    } catch (error) {
      console.error("Error reading global Prisma config:", error);
      return false;
    }
  } else {
    console.warn("Global Prisma config not found, creating...");
    try {
      const configDir = path.dirname(globalConfigPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(
        globalConfigPath,
        JSON.stringify(
          {
            accelerate: { disabled: true },
            telemetry: { enabled: false },
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error("Error creating global Prisma config:", error);
      return false;
    }
  }

  // Check .prismarc
  const prismaRcPath = path.join(homeDir, ".prismarc");
  if (fs.existsSync(prismaRcPath)) {
    try {
      const rcContent = fs.readFileSync(prismaRcPath, "utf8");
      const rc = JSON.parse(rcContent);

      if (!rc.accelerate?.disabled) {
        console.error(".prismarc does not have accelerate.disabled=true");
        return false;
      }
    } catch (error) {
      console.error("Error reading .prismarc:", error);
      return false;
    }
  } else {
    console.warn(".prismarc not found, creating...");
    try {
      fs.writeFileSync(
        prismaRcPath,
        JSON.stringify(
          {
            accelerate: { disabled: true },
            telemetry: { enabled: false },
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error("Error creating .prismarc:", error);
      return false;
    }
  }

  console.log("Prisma configuration files are correctly set up!");
  return true;
};

// Run all checks
const runValidation = () => {
  const envVarsValid = checkEnvVars();
  const schemaValid = checkSchemaPrisma();
  const configValid = checkPrismaConfig();

  console.log("\nValidation Results:");
  console.log(`- Environment Variables: ${envVarsValid ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`- Schema Configuration: ${schemaValid ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`- Prisma Configuration: ${configValid ? "✅ PASS" : "❌ FAIL"}`);

  const allValid = envVarsValid && schemaValid && configValid;
  console.log(`\nOverall Validation: ${allValid ? "✅ PASS" : "❌ FAIL"}`);

  return allValid;
};

// Execute validation
const validationPassed = runValidation();

console.log("\nDatabase Configuration Validation completed");

// Exit with proper code
process.exit(validationPassed ? 0 : 1);
