import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import { setupTestDatabase } from "../../helpers/db";

test.describe("Settings Page Accessibility", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("settings page accessibility", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to settings
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL("/settings");

    // Verify settings sections are accessible
    const sections = ["Profile", "Appearance", "Security"];
    for (const section of sections) {
      // Each section should be visible
      await expect(page.getByRole("heading", { name: section })).toBeVisible();

      // Section should be keyboard focusable
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedElement).toBeTruthy();
    }

    // Test theme toggle
    await page.click('[aria-label="Dark Theme"]');
    await expect(page.locator("body")).toHaveClass(/dark/);

    // Test menu position toggle
    await page.click('[aria-label="Top Menu"]');
    await expect(page.locator("nav")).toHaveClass(/top/);
  });
});
