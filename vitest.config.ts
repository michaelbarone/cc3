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
      "**/.{next,cursor,github,idea,git,cache,output,temp}/**",
    ],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    isolate: true,
    maxConcurrency: 5,
    sequence: {
      hooks: "stack",
      shuffle: false,
    },
    silent: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    coverage: {
      provider: "v8",
      reporter: ["html"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "**/cypress/**",
        "./**",
        "**/.{next,cursor,github,idea,git,cache,output,temp}/**",
      ],
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
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
      "@/app": resolve(__dirname, "./app"),
      "@/test": resolve(__dirname, "./test"),
    },
  },
});
