/**
 * Application Initialization Utilities
 *
 * Handles various initialization tasks for the application
 * such as environment validation, database checks, etc.
 */

import { validateEnv } from "./env-validation";

// Initialize singleton status
let envValidated = false;

/**
 * Initialize and validate application requirements
 * This function is idempotent and can be called multiple times safely
 *
 * @param options - Initialization options
 * @returns Object with validation results
 */
export function initializeApp(options: { throwOnError?: boolean } = {}) {
  const { throwOnError = process.env.NODE_ENV === "production" } = options;

  // Environment validation
  if (!envValidated) {
    const envValidation = validateEnv({
      required: ["DATABASE_URL", "JWT_SECRET", "NODE_ENV"],
      recommended: ["NEXTAUTH_URL", "NEXTAUTH_SECRET"],
      throwOnMissing: throwOnError,
    });
    envValidated = true;

    return {
      envValid: envValidation.isValid,
      missingEnvVars: envValidation.missingRequired,
      recommendations: envValidation.missingRecommended,
    };
  }

  // If already validated, return success
  return {
    envValid: true,
    missingEnvVars: [],
    recommendations: [],
  };
}

/**
 * Initialize application with sensible defaults
 * This is the recommended way to initialize the app in most cases
 */
export function initApp() {
  // In production, throw errors to prevent starting with missing env vars
  // In development/test, just log warnings
  const throwOnError = process.env.NODE_ENV === "production";
  return initializeApp({ throwOnError });
}

// Run validation immediately when this module is imported
// This ensures validation happens as early as possible
try {
  initApp();
} catch (error) {
  console.error("\x1b[31m%s\x1b[0m", "FATAL: Application initialization failed!");
  console.error(error);

  // Don't exit the process in test environment
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}
