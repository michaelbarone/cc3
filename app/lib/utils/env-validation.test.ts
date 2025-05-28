import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEnvValid, validateEnv } from "./env-validation";

describe("Environment Validation", () => {
  // Store original environment
  const originalEnv = { ...process.env };

  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  // Restore environment and console methods after each test
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should identify missing required variables", () => {
    // Remove DATABASE_URL from environment
    const testEnv = { ...process.env };
    delete testEnv.DATABASE_URL;
    process.env = testEnv;

    const result = validateEnv({
      required: ["DATABASE_URL", "JWT_SECRET"],
      throwOnMissing: false,
    });

    expect(result.isValid).toBe(false);
    expect(result.missingRequired).toContain("DATABASE_URL");
    expect(console.error).toHaveBeenCalled();
  });

  it("should identify missing recommended variables", () => {
    // Remove recommended variables
    const testEnv = { ...process.env };
    delete testEnv.NEXTAUTH_URL;
    process.env = testEnv;

    const result = validateEnv({
      required: ["DATABASE_URL"],
      recommended: ["NEXTAUTH_URL"],
      throwOnMissing: false,
    });

    expect(result.isValid).toBe(true); // Still valid as required vars are present
    expect(result.missingRecommended).toContain("NEXTAUTH_URL");
    expect(console.warn).toHaveBeenCalled();
  });

  it("should throw an error when configured and variables are missing", () => {
    // Remove required variable
    const testEnv = { ...process.env };
    delete testEnv.DATABASE_URL;
    process.env = testEnv;

    expect(() =>
      validateEnv({
        required: ["DATABASE_URL"],
        throwOnMissing: true,
      }),
    ).toThrow();
  });

  it("should not throw an error when not configured to do so", () => {
    // Remove required variable
    const testEnv = { ...process.env };
    delete testEnv.DATABASE_URL;
    process.env = testEnv;

    expect(() =>
      validateEnv({
        required: ["DATABASE_URL"],
        throwOnMissing: false,
      }),
    ).not.toThrow();
  });

  it("should return true from isEnvValid when all required variables are present", () => {
    // Ensure all required variables are present
    process.env.DATABASE_URL = "test-url";
    process.env.JWT_SECRET = "test-secret";

    // Use type assertion to bypass read-only restriction for NODE_ENV in tests
    (process.env as any).NODE_ENV = "test";

    expect(isEnvValid()).toBe(true);
  });

  it("should return false from isEnvValid when required variables are missing", () => {
    // Remove required variable
    const testEnv = { ...process.env };
    delete testEnv.DATABASE_URL;
    process.env = testEnv;

    expect(isEnvValid()).toBe(false);
  });
});
