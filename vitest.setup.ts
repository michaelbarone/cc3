import "@testing-library/jest-dom";
import path from "path";
import { TextDecoder, TextEncoder } from "util";
import { afterAll, beforeAll, vi } from "vitest";

// Polyfill TextEncoder/TextDecoder for happy-dom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Set test-specific environment variables
process.env = {
  ...process.env,
  NODE_ENV: "test",
  // Set a specific test database path to avoid conflicts
  TEST_DATABASE_PATH: path.join(process.cwd(), ".test-db", "test-database.sqlite"),
};

// Mock Next.js dynamic imports
vi.mock("next/dynamic", () => ({
  default: vi.fn(() => {
    const DynamicComponent = vi.fn(() => null) as {
      (): null;
      displayName?: string;
    };
    DynamicComponent.displayName = "LoadableComponent";
    return DynamicComponent;
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Global setup and teardown for all tests
// Note: Test-specific database operations should use the
// helpers in test/setup/test-database.ts instead of these global hooks
let testDatabaseInitialized = false;

beforeAll(async () => {
  // Lazy-load the database setup to avoid requiring it in unit tests
  if (process.env.TEST_TYPE === "integration") {
    try {
      const { setupTestDatabase } = await import("./test/setup/test-database");
      await setupTestDatabase({ initialize: true, seed: true, reset: false });
      testDatabaseInitialized = true;
      console.log("Test database initialized for integration tests");
    } catch (error) {
      console.error("Failed to initialize test database:", error);
    }
  }
}, 30000); // Allow up to 30 seconds for database initialization

afterAll(async () => {
  if (testDatabaseInitialized) {
    try {
      const { teardownTestDatabase } = await import("./test/setup/test-database");
      await teardownTestDatabase();
      console.log("Test database connection closed");
    } catch (error) {
      console.error("Failed to teardown test database:", error);
    }
  }
});
