import { test as base, expect, type Page } from "@playwright/test";
import { ChildProcess, execSync, spawn } from "child_process";
import { resetDatabaseForFirstTimeSetup } from "../helpers/db";

const test = base.extend<{}>({});

let devServer: ChildProcess | null = null;

test.beforeAll(
  async () => {
    console.log("Starting development server...");

    // Start the Next.js dev server
    devServer = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      shell: true,
      // Set detached to true so we can properly kill the process tree later
      detached: true,
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
);

test.afterAll(() => {
  if (devServer?.pid) {
    // Kill the dev server process and all its children
    if (process.platform === "win32") {
      // On Windows, we need to use taskkill to ensure all child processes are terminated
      execSync(`taskkill /pid ${devServer.pid} /T /F`, { stdio: "ignore" });
    } else {
      // On Unix-like systems, we can use process.kill with negative PID to kill the process group
      process.kill(-devServer.pid);
    }
  }
});

test.describe("First Time Setup Flow", () => {
  test.beforeEach(async () => {
    // Reset database to ensure clean state
    await resetDatabaseForFirstTimeSetup();
  });

  test("completes first-time setup successfully", async ({ page }: { page: Page }) => {
    // Visit home page - should redirect to first-time setup
    await page.goto("/");
    await expect(page).toHaveURL("/first-time-setup");

    // Fill in admin account details
    await page.fill('[name="username"]', "admin");
    await page.fill('[name="password"]', "admin-password");
    await page.fill('[name="confirmPassword"]', "admin-password");
    await page.click('button:has-text("Create Admin Account")');

    // Configure application settings
    await page.fill('[name="appName"]', "Test Dashboard");
    await page.click('button:has-text("Next")');

    // Select default theme
    await page.click('[data-theme="light"]');
    await page.click('button:has-text("Next")');

    // Enable/disable features
    await page.click('[name="enableRegistration"]');
    await page.click('button:has-text("Complete Setup")');

    // Should redirect to login
    await expect(page).toHaveURL("/login");

    // Verify we can login with new admin account
    await page.fill('[name="username"]', "admin");
    await page.fill('[name="password"]', "admin-password");
    await page.click('button:has-text("Login")');

    // Should reach dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("validates required fields", async ({ page }: { page: Page }) => {
    await page.goto("/first-time-setup");

    // Try to submit without filling required fields
    await page.click('button:has-text("Create Admin Account")');

    // Check error messages
    await expect(page.locator("text=Username is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();

    // Fill password but not confirmation
    await page.fill('[name="username"]', "admin");
    await page.fill('[name="password"]', "admin-password");
    await page.click('button:has-text("Create Admin Account")');

    // Check password confirmation error
    await expect(page.locator("text=Passwords must match")).toBeVisible();
  });

  test("prevents access to app before setup", async ({ page }: { page: Page }) => {
    // Try to access dashboard directly
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/first-time-setup");

    // Try to access settings
    await page.goto("/settings");
    await expect(page).toHaveURL("/first-time-setup");
  });
});
