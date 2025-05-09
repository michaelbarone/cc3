import { expect, test } from "@playwright/test";
import { login, loginAsAdmin } from "../../helpers/auth";
import { setupTestDatabase } from "../../helpers/db";

test.describe("Cross-browser Compatibility", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("responsive design breakpoints", async ({ page }) => {
    await login(page, "test-user");
    await expect(page).toHaveURL("/dashboard");

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1024, height: 768 }, // Tablet Landscape
      { width: 768, height: 1024 }, // Tablet Portrait
      { width: 375, height: 812 }, // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Verify core layout elements
      await expect(page.locator("nav")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();

      // Check menu behavior
      if (viewport.width < 768) {
        // Menu should be collapsed on mobile
        await expect(page.locator(".url-menu")).toHaveClass(/collapsed/);
        // Menu toggle should be visible
        await expect(page.locator('button[aria-label="Toggle Menu"]')).toBeVisible();
      } else {
        // Menu should be expanded on desktop
        await expect(page.locator(".url-menu")).not.toHaveClass(/collapsed/);
        // Menu toggle should be hidden
        await expect(page.locator('button[aria-label="Toggle Menu"]')).not.toBeVisible();
      }
    }
  });

  test("touch interactions", async ({ page }) => {
    // Only run touch tests on browsers that support touch events
    const isTouchSupported = await page.evaluate(() => "ontouchstart" in window);
    test.skip(!isTouchSupported, "Touch not supported in this browser");

    await loginAsAdmin(page);
    await page.goto("/admin/urls");

    // Test touch-based drag and drop
    const urlElement = page.locator('text="Test URL"').first();
    const targetGroup = page.locator('text="Monitoring"');

    // Simulate touch-based drag and drop
    await urlElement.hover();
    await page.mouse.down();
    await targetGroup.hover();
    await page.mouse.up();

    // Verify drag operation worked
    await expect(targetGroup.locator('text="Test URL"')).toBeVisible();
  });

  test("browser-specific CSS features", async ({ page }) => {
    await login(page, "test-user");

    // Test CSS Grid support
    const hasGridSupport = await page.evaluate(() => CSS.supports("display", "grid"));

    if (hasGridSupport) {
      // Verify grid layout
      await expect(page.locator(".dashboard-grid")).toHaveCSS("display", "grid");
    } else {
      // Verify fallback layout
      await expect(page.locator(".dashboard-grid")).toHaveCSS("display", "flex");
    }

    // Test CSS Custom Properties support
    const hasCustomPropertiesSupport = await page.evaluate(() =>
      CSS.supports("(--custom-property: red)"),
    );

    if (hasCustomPropertiesSupport) {
      // Verify theme variables are working
      await page.click('[aria-label="Dark Theme"]');
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 18, 18)");
    }
  });
});
