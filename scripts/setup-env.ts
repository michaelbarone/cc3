import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the workspace root
const rootDir = path.join(__dirname, "..");

async function main() {
  // Import constants in a way that works with ESM
  const { MIGRATION_DATABASE_URL } = await import("../app/lib/db/constants.js").catch(() => {
    // Fallback if direct import fails
    return {
      MIGRATION_DATABASE_URL: `file:${path.join(rootDir, "data", "app.db")}`,
    };
  });

  const ENV_FILE = path.join(rootDir, ".env.local");

  // Create .env.local file with the hardcoded database URL
  const envContent = `# Auto-generated environment file - do not edit manually
# Created at ${new Date().toISOString()}

# Database configuration
DATABASE_URL="${MIGRATION_DATABASE_URL}"

# Other environment variables can be added here
`;

  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`Environment file created at ${ENV_FILE}`);
}

main().catch((error) => {
  console.error("Error setting up environment:", error);
  process.exit(1);
});
