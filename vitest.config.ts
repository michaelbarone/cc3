import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
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
        "**/__tests__/**",
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
