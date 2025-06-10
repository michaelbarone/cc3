import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbConfig from "./database-config";
const { DB_CONFIG } = dbConfig;

describe("Database Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
    vi.resetModules();
  });

  it("should provide runtime URL with file:// protocol", () => {
    // Verify current config has expected format
    expect(DB_CONFIG.runtimeUrl).toMatch(/^file:/);
  });

  it("should provide CLI URL with file: protocol", () => {
    // Verify current config has expected format
    expect(DB_CONFIG.cliUrl).toMatch(/^file:/);
  });

  it("should convert prisma:// URL to file: URL", () => {
    const prismaUrl = "prisma://./test.db";
    const fileUrl = DB_CONFIG.toCliUrl!(prismaUrl);

    expect(fileUrl).toBe("file:./test.db");
  });

  it("should keep file: URL as file: URL", () => {
    const fileUrl = "file:./test.db";
    const resultUrl = DB_CONFIG.toRuntimeUrl!(fileUrl);

    expect(resultUrl).toBe("file:./test.db");
  });

  it("should extract file path from URLs", () => {
    // Test with specific inputs rather than relying on the implementation
    expect(DB_CONFIG.toFilePath!("prisma://./test.db")).toBe("./test.db");
    expect(DB_CONFIG.toFilePath!("file://./test.db")).toBe("./test.db");
  });

  it("should provide expected directory structure", () => {
    // Verify directory is derived from filePath
    const filePath = DB_CONFIG.filePath || "";
    const expectedDir = path.dirname(filePath);
    expect(DB_CONFIG.directory).toBe(expectedDir);
  });
});
