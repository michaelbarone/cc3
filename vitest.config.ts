import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/mocks/**", // Exclude mock files
      "test/setup.ts", // Exclude setup file
      "test/utils/**", // Exclude test utilities
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "cobertura"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "test/**",
        "vite.config.ts",
        "**/*.test.{ts,tsx}",
        "**/mocks/**",
      ],
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      all: true,
      clean: true,
      cleanOnRerun: true,
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        // Add specific thresholds for critical paths
        "./app/components/iframe/**/*.{ts,tsx}": {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        "./app/lib/state/**/*.{ts,tsx}": {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
    globals: true,
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
