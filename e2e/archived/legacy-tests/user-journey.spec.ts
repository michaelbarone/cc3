import { test as base, expect, type Page } from "@playwright/test";
import { login, loginAsAdmin, logout } from "../helpers/auth";
import { setupTestDatabase, TEST_DATA } from "../helpers/db";

// Extend the test with custom fixtures if needed
const test = base.extend<{}>({});

test.describe("Complete User Journey", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("admin journey - complete application setup and configuration", async ({ page }) => {
    // Start with admin login
    await loginAsAdmin(page);
    await expect(page).toHaveURL("/dashboard");

    // Test Dashboard Layout and Navigation
    await verifyDashboardLayout(page);

    // Navigate to and test Settings
    await testSettingsConfiguration(page);

    // Navigate to and test Admin URL Management
    await testUrlManagement(page);

    // Navigate to and test Admin Icon Management
    await testIconManagement(page);

    // Logout to test regular user flow
    await logout(page);
  });

  test("regular user journey - dashboard usage and customization", async ({ page }) => {
    // Login as regular user
    await login(page, "test-user", "test-password");
    await expect(page).toHaveURL("/dashboard");

    // Test Dashboard Interactions
    await testDashboardInteractions(page);

    // Test User Settings
    await testUserSettings(page);

    // Test URL Group Usage
    await testUrlGroupUsage(page);
  });
});

async function verifyDashboardLayout(page: Page) {
  // Check core layout elements
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator(".url-menu")).toBeVisible();

  // Verify responsive design
  if (page.viewportSize()?.width! < 768) {
    await expect(page.locator(".url-menu")).toHaveClass(/collapsed/);
    await expect(page.locator('button[aria-label="Toggle Menu"]')).toBeVisible();
  } else {
    await expect(page.locator(".url-menu")).not.toHaveClass(/collapsed/);
    await expect(page.locator('button[aria-label="Toggle Menu"]')).not.toBeVisible();
  }
}

async function testSettingsConfiguration(page: Page) {
  // Navigate to settings
  await page.click('a[href="/settings"]');
  await expect(page).toHaveURL("/settings");

  // Test theme settings
  await page.click('[aria-label="Dark Theme"]');
  await expect(page.locator("body")).toHaveClass(/dark/);

  // Test menu position
  await page.click('[aria-label="Top Menu"]');
  await expect(page.locator("nav")).toHaveClass(/top/);

  // Test security settings
  const sections = ["Profile", "Appearance", "Security"];
  for (const section of sections) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
}

async function testUrlManagement(page: Page) {
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
  await urlElement.dragTo(targetGroup);
  await expect(targetGroup.locator('text="Test URL"')).toBeVisible();
}

async function testIconManagement(page: Page) {
  await page.goto("/admin/icons");
  await expect(page.locator('h1:has-text("Icon Management")')).toBeVisible();

  // Test icon upload (assuming test icon exists)
  const uploadButton = page.getByRole("button", { name: "Upload Icon" });
  await expect(uploadButton).toBeVisible();

  // Note: Actual file upload would need test assets to be set up
  // This is a placeholder for the icon upload test
  await expect(uploadButton).toBeEnabled();
}

async function testDashboardInteractions(page: Page) {
  // Test URL group expansion
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

async function testUserSettings(page: Page) {
  // Navigate to user settings
  await page.click('a[href="/settings"]');

  // Test theme preference
  await page.click('[aria-label="Dark Theme"]');
  await expect(page.locator("body")).toHaveClass(/dark/);

  // Test layout preference
  await page.click('[aria-label="Top Menu"]');
  await expect(page.locator("nav")).toHaveClass(/top/);
}

async function testUrlGroupUsage(page: Page) {
  // Navigate back to dashboard
  await page.click('a[href="/dashboard"]');

  // Test URL group interactions
  await page.click(`text=${TEST_DATA.groups.monitoring.name}`);

  // Verify monitoring URLs are visible
  for (const url of TEST_DATA.groups.monitoring.urls) {
    await expect(page.getByText(url.title)).toBeVisible();
  }

  // Test URL opening
  await page.click(`text=${TEST_DATA.groups.monitoring.urls[0].title}`);
  await expect(page.locator("iframe")).toBeVisible();
}
