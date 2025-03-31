import { test as base, expect, Page } from "@playwright/test";
import { ChildProcess, spawn } from "child_process";
import { resetDatabaseForFirstTimeSetup } from "../../helpers/db";

const test = base.extend<{}>({});

let devServer: ChildProcess;

test.beforeAll(
  async () => {
    console.log("Starting development server...");

    // Start the Next.js dev server
    devServer = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      shell: true,
    });

    // Handle server errors
    devServer.on("error", (error) => {
      console.error("Failed to start development server:", error);
      throw error;
    });

    // Wait for the dev server to be ready
    const maxRetries = 60; // 60 retries * 2 second delay = 2 minutes max wait
    const retryDelay = 2000; // 2 seconds between retries

    await new Promise((resolve, reject) => {
      let retries = 0;

      const checkServer = async () => {
        try {
          console.log(`Checking if server is ready (attempt ${retries + 1}/${maxRetries})...`);
          const response = await fetch("http://localhost:3000");
          if (response.ok) {
            console.log("Development server is ready");
            resolve(true);
            return;
          }
        } catch (error: unknown) {
          // Server not ready yet
          if (retries >= maxRetries) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            reject(
              new Error(`Server failed to start after ${maxRetries} attempts: ${errorMessage}`),
            );
            return;
          }
        }
        retries++;
        setTimeout(checkServer, retryDelay);
      };

      checkServer();
    });
  },
  { timeout: 180000 },
); // 3 minutes timeout

test.afterAll(async () => {
  // Cleanup the dev server
  if (devServer) {
    console.log("Shutting down development server...");
    try {
      // On Windows, we need to kill the process tree
      if (process.platform === "win32" && devServer.pid !== undefined) {
        spawn("taskkill", ["/pid", devServer.pid.toString(), "/f", "/t"]);
      } else {
        devServer.kill("SIGTERM");
      }
    } catch (error) {
      console.error("Error shutting down development server:", error);
    }
  }
});

test.describe("First Time Setup Flow", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Reset database before each test
    try {
      console.log("Starting database reset...");
      await resetDatabaseForFirstTimeSetup();
      console.log("Database reset completed");

      // Start from home page with retry
      let retries = 3;
      while (retries > 0) {
        try {
          await page.goto("http://localhost:3000", { timeout: 30000 });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`Retrying page load (${retries} attempts remaining)...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error("Failed to reset database or load page:", error);
      throw error;
    }
  });

  test.afterEach(async ({ page }: { page: Page }) => {
    // Cleanup after each test
    await page.close();
  });

  test("prevents access to protected routes during setup", async ({ page }: { page: Page }) => {
    // Try to access dashboard directly
    await page.goto("http://localhost:3000/dashboard", { timeout: 30000 });

    // Should redirect back to first-run
    await expect(page).toHaveURL("http://localhost:3000/first-run");

    // Try to access admin area
    await page.goto("http://localhost:3000/admin", { timeout: 30000 });

    // Should redirect back to first-run
    await expect(page).toHaveURL("http://localhost:3000/first-run");
  });
});
