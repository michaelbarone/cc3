/**
 * Utils module index
 * Exports all utility functions
 */

// Re-export all utilities
export * from "./app-init";
export * from "./env-validation";

// Import app initialization to run validation at the earliest point
import "./app-init";
