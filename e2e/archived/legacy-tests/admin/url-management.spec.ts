import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import { setupTestDatabase, TEST_DATA } from "../../helpers/db";

test.describe("URL Management Workflow", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("URL management workflow", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to URL management
    await page.click('a[href="/admin/urls"]');

    // Create new URL group
    await page.click('button:has-text("New Group")');
    await page.fill('[name="groupName"]', "Test Group");
    await page.fill('[name="description"]', "Test Description");
    await page.click('button:has-text("Create")');

    // Verify group was created
    await expect(page.getByText("Test Group")).toBeVisible();

    // Add URL to group
    await page.click('button:has-text("Add URL")');
    await page.fill('[name="title"]', "Test URL");
    await page.fill('[name="url"]', "https://example.com");
    await page.click('button:has-text("Add")');

    // Verify URL was added
    await expect(page.getByText("Test URL")).toBeVisible();

    // Test drag and drop reordering
    const urlElement = page.locator('text="Test URL"').first();
    const targetGroup = page.locator(`text="${TEST_DATA.groups.monitoring.name}"`);

    // Drag URL to different group
    await urlElement.dragTo(targetGroup);

    // Verify URL moved to new group
    await expect(targetGroup.locator('text="Test URL"')).toBeVisible();
  });
});
