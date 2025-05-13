import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers/auth";
import { setupTestDatabase, TEST_DATA } from "./helpers/db";

test.describe("Smoke Tests", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("basic navigation flow", async ({ page }) => {
    // Visit home page
    await page.goto("/");
    await expect(page).toHaveURL("/login");

    // Login
    await login(page, "test-user", "test-password");
    await expect(page).toHaveURL("/dashboard");

    // Verify seeded data is visible
    await expect(page.getByText(TEST_DATA.groups.development.name)).toBeVisible();
    await expect(page.getByText(TEST_DATA.groups.monitoring.name)).toBeVisible();

    // Check navigation
    await page.click("text=Settings");
    await expect(page).toHaveURL("/settings");

    // Logout
    await logout(page);
    await expect(page).toHaveURL("/login");
  });

  test("responsive design", async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.locator(".desktop-menu")).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator(".mobile-menu-button")).toBeVisible();
  });
});
