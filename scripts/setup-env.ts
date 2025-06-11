import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the workspace root
const rootDir = path.join(__dirname, "..");

async function main() {
  // Import constants in a way that works with ESM
  const { getMigrationDatabaseUrl } = await import("../app/lib/db/constants").catch(() => {
    // Fallback if direct import fails
    console.log("Fallback to hardcoded database URL");
    return {
      getMigrationDatabaseUrl: () => `file:${path.join(rootDir, "data", "app.db")}`,
    };
  });

  const ENV_FILE = path.join(rootDir, ".env.local");

  // Get the environment-aware database URL
  const databaseUrl = getMigrationDatabaseUrl();

  // Create .env.local file with the environment-aware database URL
  const envContent = `# Auto-generated environment file - do not edit manually
# Created at ${new Date().toISOString()}

# Database configuration
DATABASE_URL="${databaseUrl}"
${process.env.DOCKER_CONTAINER ? "DOCKER_CONTAINER=true" : ""}

# Other environment variables can be added here
`;

  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`Environment file created at ${ENV_FILE}`);
}

main().catch((error) => {
  console.error("Error setting up environment:", error);
  process.exit(1);
});
