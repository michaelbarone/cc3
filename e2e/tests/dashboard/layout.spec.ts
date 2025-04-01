import { expect, test, type Page } from "@playwright/test";
import { login } from "../../helpers/auth";
import { setupTestDatabase, TEST_DATA } from "../../helpers/db";

test.describe("Dashboard Layout and Functionality", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  async function verifyDashboardLayout(page: Page) {
    // Check core layout elements
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".url-menu")).toBeVisible();
  }

  async function verifyUrlGroupInteractions(page: Page) {
    // Expand development group
    await page.click(`text=${TEST_DATA.groups.development.name}`);

    // Verify URLs are visible
    for (const url of TEST_DATA.groups.development.urls) {
      await expect(page.getByText(url.title)).toBeVisible();
    }

    // Click first URL
    await page.click(`text=${TEST_DATA.groups.development.urls[0].title}`);

    // Verify iframe appears
    await expect(page.locator("iframe")).toBeVisible();
  }

  test("dashboard layout and functionality", async ({ page }) => {
    // Login and verify redirect
    await login(page, "test-user");
    await expect(page).toHaveURL("/dashboard");

    // Verify layout
    await verifyDashboardLayout(page);

    // Test URL group interactions
    await verifyUrlGroupInteractions(page);

    // Test responsive menu
    if (page.viewportSize()?.width! < 768) {
      // Menu should be collapsed on mobile
      await expect(page.locator(".url-menu")).toHaveClass(/collapsed/);

      // Open menu
      await page.click('button[aria-label="Toggle Menu"]');
      await expect(page.locator(".url-menu")).not.toHaveClass(/collapsed/);
    }
  });
});
