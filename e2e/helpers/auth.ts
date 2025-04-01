import { expect, type Page } from "@playwright/test";

/**
 * Authentication utilities for E2E tests
 */

export async function login(page: Page, username: string, password: string) {
  try {
    console.log(`Attempting to login as ${username}...`);

    // Navigate to login page without waiting for network idle
    console.log("Navigating to login page...");
    await page.goto("/login");

    // Wait for login page to be ready with a more generous timeout
    console.log("Waiting for login page elements...");
    await page.waitForSelector("#login-instruction", {
      state: "visible",
      timeout: 30000,
    });

    // Debug: Check if we're actually on the login page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Wait for user tiles with debugging
    console.log("Waiting for user tiles to load...");
    try {
      await page.waitForSelector("[data-user-id]", {
        state: "visible",
        timeout: 30000,
      });
    } catch (e) {
      console.log("Failed to find user tiles, dumping page content...");
      const content = await page.content();
      console.log("Page content:", content);
      throw e;
    }

    // Debug: Log all user tiles found
    const userTiles = await page.locator("[data-user-id]").all();
    console.log(`Found ${userTiles.length} user tiles`);

    // Debug: Log the text content of each tile
    for (const tile of userTiles) {
      const tileText = await tile.textContent();
      const tileId = await tile.getAttribute("data-user-id");
      console.log(`User tile [${tileId}] text: ${tileText}`);
    }

    // Try to find the specific user tile using multiple strategies
    console.log(`Looking for user tile with username: ${username}`);

    // First try: Direct username match within a user tile
    const userTile = await page.locator(`[data-user-id] h6:has-text("${username}")`).first();

    // Debug: Log if we found the user tile
    const isVisible = await userTile.isVisible().catch(() => false);
    console.log(`User tile found and visible: ${isVisible}`);

    if (!isVisible) {
      console.log("User tile not found with primary strategy, trying alternatives...");
      // Log all h6 elements for debugging
      const allHeadings = await page.locator("h6").all();
      for (const heading of allHeadings) {
        const text = await heading.textContent();
        console.log(`Found heading with text: ${text}`);
      }
      throw new Error(`Could not find user tile for ${username}`);
    }

    // Click the user tile
    console.log("Clicking user tile...");
    await userTile.click();

    // If password is required, handle password input
    if (password) {
      console.log("Entering password...");
      await page.waitForSelector('input[type="password"]', {
        state: "visible",
        timeout: 10000,
      });
      await page.fill('input[type="password"]', password);

      // Find and click the login button
      const loginButton = page.getByRole("button", { name: /log in/i });
      await loginButton.waitFor({ state: "visible" });
      await loginButton.click();
    }

    // Wait for successful navigation or error message
    await Promise.race([
      expect(page).toHaveURL("/dashboard", { timeout: 20000 }),
      expect(page.getByText(/Invalid credentials|User not found/)).toBeVisible({ timeout: 20000 }),
    ]);

    // If we're still on login page, throw error
    const finalUrl = page.url();
    if (finalUrl.includes("/login")) {
      throw new Error("Login failed - still on login page");
    }
  } catch (error: unknown) {
    // Enhanced error message with current page state
    const errorMessage = `Login failed: ${error instanceof Error ? error.message : "Unknown error"}. Current URL: ${page.url()}`;

    // Try to get additional debug info
    try {
      const html = await page.content();
      console.log("Debug - Page HTML at failure:", html);
    } catch (e) {
      console.log("Debug - Could not get page HTML:", e);
    }

    throw new Error(errorMessage);
  }
}

export async function loginAsAdmin(
  page: Page,
  credentials?: { username?: string; password?: string },
) {
  const username = credentials?.username ?? "admin";
  const password = credentials?.password ?? "admin-password";
  await login(page, username, password);

  // Only verify admin access for valid credentials
  if (!credentials) {
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  }
}

export async function logout(page: Page) {
  await page.click('button:has-text("Logout")');
  await expect(page).toHaveURL("/login");
}

export async function register(page: Page, username: string, email: string, password: string) {
  await page.goto("/register");
  await page.fill('[name="username"]', username);
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.fill('[name="confirmPassword"]', password);
  await page.click('[name="acceptTerms"]');
  await page.click('button:has-text("Register")');
  await expect(page.getByText("Registration successful")).toBeVisible();
}

export async function completeInitialSetup(page: Page, displayName: string) {
  await expect(page).toHaveURL("/setup");
  await page.fill('[name="displayName"]', displayName);
  await page.click('button:has-text("Continue")');
  await page.click('[aria-label="Dark Theme"]');
  await page.click('[aria-label="Top Menu"]');
  await page.click('button:has-text("Save Preferences")');
  await expect(page.getByText("Setup complete")).toBeVisible();
}

export async function requestPasswordReset(page: Page, email: string) {
  await page.goto("/forgot-password");
  await page.fill('[name="email"]', email);
  await page.click('button:has-text("Reset Password")');
  await expect(page.getByText("Password reset email sent")).toBeVisible();
}

export async function verifyProtectedAccess(page: Page, url: string) {
  await page.goto(url);
  await expect(page).toHaveURL("/login");
}
