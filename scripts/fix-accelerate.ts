#!/usr/bin/env node

/**
 * Prisma Accelerate Fix Script
 *
 * This script explicitly disables Prisma Accelerate by modifying environment variables
 * and creating a .prismarc file if needed.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

console.log("Starting Prisma Accelerate Fix...");

// Ensure environment variable is set
process.env.PRISMA_ACCELERATE_DISABLED = "true";
console.log("Set PRISMA_ACCELERATE_DISABLED=true in process environment");

// Create .prismarc file in home directory
const homeDir = os.homedir();
const prismaRcPath = path.join(homeDir, ".prismarc");

interface PrismaRcConfig {
  accelerate: {
    disabled: boolean;
  };
}

const prismaRcContent = JSON.stringify(
  {
    accelerate: {
      disabled: true,
    },
  } as PrismaRcConfig,
  null,
  2,
);

try {
  fs.writeFileSync(prismaRcPath, prismaRcContent);
  console.log(`Created ${prismaRcPath} with Accelerate disabled`);
} catch (error) {
  console.error(`Error creating ${prismaRcPath}:`, error);
}

// Also modify .env file if it exists
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf8");

  // Ensure PRISMA_ACCELERATE_DISABLED=true
  if (envContent.includes("PRISMA_ACCELERATE_DISABLED=")) {
    envContent = envContent.replace(
      /PRISMA_ACCELERATE_DISABLED=.*/,
      "PRISMA_ACCELERATE_DISABLED=true",
    );
  } else {
    envContent += "\nPRISMA_ACCELERATE_DISABLED=true";
  }

  // Ensure both DATABASE_URL and DIRECT_DATABASE_URL use file: protocol
  if (envContent.includes("DATABASE_URL=prisma:")) {
    envContent = envContent.replace(/DATABASE_URL=prisma:(.*)/, "DATABASE_URL=file:$1");
  }

  if (envContent.includes("DIRECT_DATABASE_URL=prisma:")) {
    envContent = envContent.replace(
      /DIRECT_DATABASE_URL=prisma:(.*)/,
      "DIRECT_DATABASE_URL=file:$1",
    );
  }

  // Make DATABASE_URL match DIRECT_DATABASE_URL
  const directUrlMatch = envContent.match(/DIRECT_DATABASE_URL=([^\n]*)/);
  if (directUrlMatch) {
    const directUrl = directUrlMatch[1];
    envContent = envContent.replace(/DATABASE_URL=([^\n]*)/, `DATABASE_URL=${directUrl}`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env file with corrected database URLs and Prisma settings");
}

// Create a .npmrc file to disable Prisma telemetry
const npmrcPath = path.join(process.cwd(), ".npmrc");
const npmrcContent = "prisma-accelerate-disabled=true\nprisma-telemetry-disabled=1\n";

try {
  fs.writeFileSync(npmrcPath, npmrcContent);
  console.log(`Created ${npmrcPath} with Prisma settings`);
} catch (error) {
  console.error(`Error creating ${npmrcPath}:`, error);
}

// Create a global Prisma CLI config
const globalPrismaPath = path.join(homeDir, ".prisma/config.json");
const globalPrismaDir = path.dirname(globalPrismaPath);

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(globalPrismaDir)) {
    fs.mkdirSync(globalPrismaDir, { recursive: true });
  }

  // Create or update config.json
  const globalPrismaConfig = {
    telemetry: {
      enabled: false,
    },
    accelerate: {
      disabled: true,
    },
  };

  fs.writeFileSync(globalPrismaPath, JSON.stringify(globalPrismaConfig, null, 2));
  console.log(`Created global Prisma config at ${globalPrismaPath}`);
} catch (error) {
  console.error(`Error creating global Prisma config:`, error);
}

// Check and update package.json if it exists
try {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    let updated = false;

    // Check if there are any Prisma Accelerate related dependencies
    if (packageJson.dependencies && packageJson.dependencies["@prisma/accelerate"]) {
      delete packageJson.dependencies["@prisma/accelerate"];
      updated = true;
      console.log("Removed @prisma/accelerate from dependencies");
    }

    if (packageJson.devDependencies && packageJson.devDependencies["@prisma/accelerate"]) {
      delete packageJson.devDependencies["@prisma/accelerate"];
      updated = true;
      console.log("Removed @prisma/accelerate from devDependencies");
    }

    // Check if there are any scripts that reference Prisma Accelerate
    if (packageJson.scripts) {
      for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
        if (typeof scriptCommand === "string" && scriptCommand.includes("prisma accelerate")) {
          packageJson.scripts[scriptName] = scriptCommand.replace(/prisma accelerate[^&;]*/g, "");
          updated = true;
          console.log(`Removed prisma accelerate from script: ${scriptName}`);
        }
      }
    }

    // Save updated package.json if changes were made
    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("Updated package.json file");
    }
  }
} catch (error) {
  console.error("Error checking/updating package.json:", error);
}

// Also create a custom .env.local file to override any Prisma Accelerate settings
const envLocalPath = path.join(process.cwd(), ".env.local");
const envLocalContent = `# Force disable Prisma Accelerate
PRISMA_ACCELERATE_DISABLED=true

# Force direct database connections
DATABASE_URL=file:./data/app.db
DIRECT_DATABASE_URL=file:./data/app.db

# Other Prisma settings
PRISMA_TELEMETRY_DISABLED=1
`;

try {
  fs.writeFileSync(envLocalPath, envLocalContent);
  console.log(`Created ${envLocalPath} with forced direct database connections`);
} catch (error) {
  console.error(`Error creating ${envLocalPath}:`, error);
}

// Patch the database-config.ts file to ensure toRuntimeUrl returns file: protocol
const dbConfigPath = path.join(process.cwd(), "app/lib/db/database-config.ts");
if (fs.existsSync(dbConfigPath)) {
  let dbConfigContent = fs.readFileSync(dbConfigPath, "utf8");

  // Check if toRuntimeUrl method exists and returns prisma:// protocol
  if (dbConfigContent.includes("toRuntimeUrl") && dbConfigContent.includes("prisma:")) {
    // Define the replacement function for toRuntimeUrl
    const fileProtocolImplementation = `toRuntimeUrl: (url: string): string => {
    // Always ensure it's using file: protocol
    if (url.startsWith("prisma:")) {
      return url.replace(/^prisma:/, "file:");
    }
    return url.startsWith("file:") ? url : \`file:\${url}\`;
  }`;

    // Simple approach to replace functions that return prisma:// URLs
    // This avoids using the /s flag in regex
    if (dbConfigContent.includes("return") && dbConfigContent.includes("prisma:")) {
      // Look for function-style toRuntimeUrl
      const functionPattern =
        /toRuntimeUrl\s*[:=]\s*function\s*\([^)]*\)\s*\{[\s\S]*?return[\s\S]*?prisma:[\s\S]*?;[\s\S]*?\}/;
      dbConfigContent = dbConfigContent.replace(functionPattern, fileProtocolImplementation);

      // Look for arrow function-style toRuntimeUrl
      const arrowPattern =
        /toRuntimeUrl\s*[:=]\s*\([^)]*\)\s*=>[\s\S]*?\{[\s\S]*?return[\s\S]*?prisma:[\s\S]*?;[\s\S]*?\}/;
      if (!dbConfigContent.includes('return url.startsWith("file:")')) {
        dbConfigContent = dbConfigContent.replace(arrowPattern, fileProtocolImplementation);
      }
    }

    // If the method doesn't exist, add it to DB_CONFIG
    if (!dbConfigContent.includes("toRuntimeUrl")) {
      // Find the DB_CONFIG object using [\s\S]* instead of /s flag
      const dbConfigPattern = /export\s+const\s+DB_CONFIG\s*[:=]\s*\{[\s\S]*?\}/;
      const dbConfigObjectMatch = dbConfigContent.match(dbConfigPattern);
      if (dbConfigObjectMatch) {
        const originalDbConfigObject = dbConfigObjectMatch[0];
        const updatedDbConfigObject = originalDbConfigObject.replace(
          /}\s*;?\s*$/,
          `,
  // Add the toRuntimeUrl method to maintain compatibility but ensure file: protocol
  toRuntimeUrl: (url: string): string => {
    // Always ensure it's using file: protocol
    if (url.startsWith("prisma:")) {
      return url.replace(/^prisma:/, "file:");
    }
    return url.startsWith("file:") ? url : \`file:\${url}\`;
  }
};`,
        );

        dbConfigContent = dbConfigContent.replace(originalDbConfigObject, updatedDbConfigObject);
      }
    }

    // Add the toRuntimeUrl property to the DatabaseConfig interface if needed
    if (!dbConfigContent.includes("toRuntimeUrl?:")) {
      const interfacePattern = /interface\s+DatabaseConfig\s*\{[\s\S]*?\}/;
      const interfaceMatch = dbConfigContent.match(interfacePattern);
      if (interfaceMatch) {
        const originalInterface = interfaceMatch[0];
        const updatedInterface = originalInterface.replace(
          /}\s*$/,
          `  toRuntimeUrl?: (url: string) => string;
}`,
        );

        dbConfigContent = dbConfigContent.replace(originalInterface, updatedInterface);
      }
    }

    fs.writeFileSync(dbConfigPath, dbConfigContent);
    console.log("Updated database-config.ts to ensure toRuntimeUrl returns file: protocol");
  } else if (!dbConfigContent.includes("toRuntimeUrl")) {
    // If toRuntimeUrl doesn't exist at all, we'll add it manually instead of using regex
    // Step 1: Add to interface
    const interfaceLines = dbConfigContent.split("\n");
    let interfaceEndIndex = -1;

    for (let i = 0; i < interfaceLines.length; i++) {
      if (
        interfaceLines[i].includes("interface DatabaseConfig") ||
        interfaceLines[i].includes("type DatabaseConfig")
      ) {
        // Found the interface/type definition
        // Now find where it ends
        for (let j = i + 1; j < interfaceLines.length; j++) {
          if (interfaceLines[j].includes("}")) {
            interfaceEndIndex = j;
            break;
          }
        }
        break;
      }
    }

    if (interfaceEndIndex > 0) {
      // Add the toRuntimeUrl property to the interface
      interfaceLines.splice(interfaceEndIndex, 0, "  toRuntimeUrl?: (url: string) => string;");

      // Step 2: Add to DB_CONFIG object
      let dbConfigEndIndex = -1;
      for (let i = 0; i < interfaceLines.length; i++) {
        if (
          interfaceLines[i].includes("export const DB_CONFIG") ||
          interfaceLines[i].includes("export const DB_CONFIG:")
        ) {
          // Found the DB_CONFIG definition
          // Now find where it ends
          for (let j = i + 1; j < interfaceLines.length; j++) {
            if (interfaceLines[j].includes("};")) {
              dbConfigEndIndex = j;
              break;
            }
          }
          break;
        }
      }

      if (dbConfigEndIndex > 0) {
        // Add the toRuntimeUrl implementation to DB_CONFIG
        interfaceLines.splice(
          dbConfigEndIndex,
          0,
          "",
          "  // Add the toRuntimeUrl method to maintain compatibility but ensure file: protocol",
          "  toRuntimeUrl: (url: string): string => {",
          "    // Always ensure it's using file: protocol",
          '    if (url.startsWith("prisma:")) {',
          '      return url.replace(/^prisma:/, "file:");',
          "    }",
          '    return url.startsWith("file:") ? url : `file:${url}`;',
          "  }",
        );

        // Write the updated content back to the file
        dbConfigContent = interfaceLines.join("\n");
        fs.writeFileSync(dbConfigPath, dbConfigContent);
        console.log("Added toRuntimeUrl method to database-config.ts");
      } else {
        console.log("Could not locate DB_CONFIG object in database-config.ts");
      }
    } else {
      console.log("Could not locate DatabaseConfig interface in database-config.ts");
    }
  } else {
    console.log("Database config toRuntimeUrl already returns file: protocol - no changes needed");
  }
}

console.log("Prisma Accelerate Fix completed");
