import { chromium, Page } from "@playwright/test";
import { getConfig } from "./config";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    database: boolean;
    filesystem: boolean;
    memory: boolean;
  };
  version: string;
  metrics?: {
    uptime: number;
    responseTime: number;
    memoryUsage: number;
  };
  error?: string;
}

async function waitForHealthyServer(): Promise<boolean> {
  const config = getConfig();
  const maxAttempts = config.healthCheck.maxAttempts;
  const baseDelay = config.healthCheck.baseDelay;
  const timeout = config.healthCheck.timeout;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts}: Checking server health...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${config.environment.baseUrl}/api/health`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          console.log(`Health check failed with status ${response.status}`);
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "healthy") {
          console.log("Server is healthy!");
          return true;
        }

        console.log("Server reported unhealthy status");
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(`Health check attempt ${attempt} failed:`, errorMessage);
    }

    if (attempt < maxAttempts) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

async function verifyLoginPage(page: Page): Promise<boolean> {
  const config = getConfig();
  try {
    console.log("Navigating to login page...");
    await page.goto(`${config.environment.baseUrl}/login`);

    // Wait for the login instruction text first
    console.log("Waiting for login instruction text...");
    await page.waitForSelector("#login-instruction", {
      state: "visible",
      timeout: config.healthCheck.timeout,
    });

    // Wait for user tiles to be loaded (this indicates the /api/auth/users call completed)
    console.log("Waiting for user tiles to load...");
    await page.waitForSelector("[data-user-id]", {
      state: "visible",
      timeout: config.healthCheck.timeout,
    });

    // Verify we can interact with a user tile (this ensures the page is fully interactive)
    console.log("Verifying user tile interactivity...");
    const userTile = await page.locator("[data-user-id]").first();
    await userTile.hover();

    console.log("Login page verification complete!");
    return true;
  } catch (error) {
    console.error("Failed to verify login page:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

export default async function globalSetup() {
  const config = getConfig();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // First check if server is healthy
    const isServerHealthy = await waitForHealthyServer();
    if (!isServerHealthy) {
      throw new Error("Server health check failed after maximum retries");
    }

    // Then verify we can actually load the login page
    const isLoginPageAccessible = await verifyLoginPage(page);
    if (!isLoginPageAccessible) {
      throw new Error("Failed to verify login page accessibility");
    }
  } finally {
    await browser.close();
  }
}
