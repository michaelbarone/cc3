/**
 * E2E Test Configuration
 *
 * This file contains all configuration options for E2E tests.
 * Values can be overridden using environment variables.
 */

export interface TestConfig {
  healthCheck: {
    /** Maximum number of retry attempts for health check */
    maxAttempts: number;
    /** Base delay in milliseconds between retries (will be multiplied for exponential backoff) */
    baseDelay: number;
    /** Timeout in milliseconds for each health check attempt */
    timeout: number;
    /** Health check endpoint path */
    endpoint: string;
  };
  browser: {
    /** Global timeout for browser operations */
    timeout: number;
    /** Whether to capture screenshots on failure */
    screenshots: boolean;
    /** Whether to record videos of test runs */
    video: boolean;
    /** Directory to store test artifacts (screenshots, videos) */
    artifactsDir: string;
  };
  environment: {
    /** Base URL for the application */
    baseUrl: string;
    /** Log level for test output */
    logLevel: "debug" | "info" | "warn" | "error";
    /** Whether to preserve test output between runs */
    preserveOutput: boolean;
  };
}

/**
 * Default configuration values
 * These can be overridden using environment variables
 */
export const defaultConfig: TestConfig = {
  healthCheck: {
    maxAttempts: Number(process.env.TEST_HEALTH_MAX_ATTEMPTS) || 5,
    baseDelay: Number(process.env.TEST_HEALTH_BASE_DELAY) || 1000,
    timeout: Number(process.env.TEST_HEALTH_TIMEOUT) || 30000,
    endpoint: process.env.TEST_HEALTH_ENDPOINT || "/api/health",
  },
  browser: {
    timeout: Number(process.env.TEST_BROWSER_TIMEOUT) || 30000,
    screenshots: process.env.TEST_BROWSER_SCREENSHOTS !== "false",
    video: process.env.TEST_BROWSER_VIDEO === "true",
    artifactsDir: process.env.TEST_ARTIFACTS_DIR || "./test-results",
  },
  environment: {
    baseUrl: process.env.TEST_BASE_URL || "http://localhost:3000",
    logLevel: (process.env.TEST_LOG_LEVEL || "info") as TestConfig["environment"]["logLevel"],
    preserveOutput: process.env.TEST_PRESERVE_OUTPUT === "true",
  },
};

/**
 * Helper function to validate configuration
 */
export function validateConfig(config: TestConfig): void {
  // Validate health check config
  if (config.healthCheck.maxAttempts < 1) {
    throw new Error("Health check maxAttempts must be at least 1");
  }
  if (config.healthCheck.baseDelay < 100) {
    throw new Error("Health check baseDelay must be at least 100ms");
  }
  if (config.healthCheck.timeout < 1000) {
    throw new Error("Health check timeout must be at least 1000ms");
  }
  if (!config.healthCheck.endpoint.startsWith("/")) {
    throw new Error("Health check endpoint must start with /");
  }

  // Validate browser config
  if (config.browser.timeout < 1000) {
    throw new Error("Browser timeout must be at least 1000ms");
  }

  // Validate environment config
  try {
    new URL(config.environment.baseUrl);
  } catch {
    throw new Error("Invalid baseUrl format");
  }
}

/**
 * Get configuration with optional overrides
 */
export function getConfig(overrides?: Partial<TestConfig>): TestConfig {
  const config = {
    ...defaultConfig,
    ...overrides,
    healthCheck: {
      ...defaultConfig.healthCheck,
      ...(overrides?.healthCheck || {}),
    },
    browser: {
      ...defaultConfig.browser,
      ...(overrides?.browser || {}),
    },
    environment: {
      ...defaultConfig.environment,
      ...(overrides?.environment || {}),
    },
  };

  validateConfig(config);
  return config;
}

// Export default configuration
export default getConfig();
