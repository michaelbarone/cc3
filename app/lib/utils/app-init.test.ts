import * as process from "process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as envValidation from "./env-validation";

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

describe("Application Initialization", () => {
  // Use module scope for app import
  let appInit: typeof import("./app-init");

  // Mock console methods
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(envValidation, "validateEnv").mockReturnValue({
      isValid: true,
      missingRequired: [],
      missingRecommended: [],
    });
  });

  // Restore mocks after each test
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should validate environment on import", async () => {
    // Import the module to trigger the validation
    appInit = await import("./app-init");

    // Check that validateEnv was called
    expect(envValidation.validateEnv).toHaveBeenCalled();
  });

  it("should not exit process when validation succeeds", async () => {
    // Import the module to trigger the validation
    appInit = await import("./app-init");

    // Check that process.exit was not called
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("should exit process when validation fails in production", async () => {
    // Store original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // Mock validation to fail
      vi.spyOn(envValidation, "validateEnv").mockImplementation(() => {
        throw new Error("Validation failed");
      });

      // Set production environment using vi.stubEnv
      vi.stubEnv("NODE_ENV", "production");

      // Import the module to trigger the validation
      appInit = await import("./app-init");

      // Check that process.exit was called with code 1
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      // Restore original NODE_ENV
      vi.stubEnv("NODE_ENV", originalNodeEnv || "");
    }
  });

  it("should not exit process when validation fails in test environment", async () => {
    // Store original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // Mock validation to fail
      vi.spyOn(envValidation, "validateEnv").mockImplementation(() => {
        throw new Error("Validation failed");
      });

      // Set test environment using vi.stubEnv
      vi.stubEnv("NODE_ENV", "test");

      // Import the module to trigger the validation
      appInit = await import("./app-init");

      // Check that process.exit was not called
      expect(mockExit).not.toHaveBeenCalled();
    } finally {
      // Restore original NODE_ENV
      vi.stubEnv("NODE_ENV", originalNodeEnv || "");
    }
  });

  it("should return validation results from initializeApp", async () => {
    // Mock validation with specific results
    vi.spyOn(envValidation, "validateEnv").mockReturnValue({
      isValid: false,
      missingRequired: ["TEST_VAR"],
      missingRecommended: ["OPTIONAL_VAR"],
    });

    // Import the module
    appInit = await import("./app-init");

    // Call initializeApp explicitly
    const result = appInit.initializeApp({ throwOnError: false });

    // Check that results match the mocked validation
    expect(result).toEqual({
      envValid: false,
      missingEnvVars: ["TEST_VAR"],
      recommendations: ["OPTIONAL_VAR"],
    });
  });

  it("should only validate environment once", async () => {
    // Import the module
    appInit = await import("./app-init");

    // Reset the mock to track new calls
    vi.clearAllMocks();

    // Call initializeApp multiple times
    appInit.initializeApp();
    appInit.initializeApp();

    // Validate that validateEnv was only called once during import
    expect(envValidation.validateEnv).not.toHaveBeenCalled();
  });
});
