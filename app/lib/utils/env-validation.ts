/**
 * Environment Variable Validation
 *
 * This module provides utilities to validate environment variables
 * and ensure all required ones are present before application startup.
 */

/**
 * Configuration for environment variable validation
 */
interface EnvValidationConfig {
  /**
   * Required environment variables that must be present
   */
  required: string[];

  /**
   * Optional recommended environment variables
   */
  recommended?: string[];

  /**
   * Whether to throw an error if required variables are missing
   * Set to false to only log warnings (useful in development)
   */
  throwOnMissing?: boolean;
}

/**
 * Default validation configuration
 */
const defaultConfig: EnvValidationConfig = {
  required: ["DATABASE_URL", "JWT_SECRET", "NODE_ENV"],
  recommended: ["NEXTAUTH_URL", "NEXTAUTH_SECRET"],
  throwOnMissing: true, // process.env.NODE_ENV === "production",
};

/**
 * Validates that all required environment variables are present
 *
 * @param config - Configuration for validation
 * @returns Object containing validation results
 */
export function validateEnv(config: EnvValidationConfig = defaultConfig) {
  const { required, recommended = [], throwOnMissing = false } = config;

  const missingRequired = required.filter((key) => !process.env[key]);
  const missingRecommended = recommended.filter((key) => !process.env[key]);

  const isValid = missingRequired.length === 0;

  // Always log missing variables
  if (missingRequired.length > 0) {
    console.error("\x1b[31m%s\x1b[0m", "ERROR: Missing required environment variables:");
    missingRequired.forEach((key) => {
      console.error(`  - ${key}`);
    });
  }

  if (missingRecommended.length > 0) {
    console.warn("\x1b[33m%s\x1b[0m", "WARNING: Missing recommended environment variables:");
    missingRecommended.forEach((key) => {
      console.warn(`  - ${key}`);
    });
  }

  // Throw error if required and configured to do so
  if (!isValid && throwOnMissing) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(", ")}`);
  }

  return {
    isValid,
    missingRequired,
    missingRecommended,
  };
}

/**
 * Validates environment variables and returns boolean result
 * This is a simplified version that doesn't throw errors
 *
 * @returns True if all required environment variables are present
 */
export function isEnvValid(): boolean {
  const { isValid } = validateEnv({ ...defaultConfig, throwOnMissing: false });
  return isValid;
}
