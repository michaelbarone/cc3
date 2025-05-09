import { expect, type Page } from "@playwright/test";
import { TEST_DATA } from "./db";

/**
 * Shared layout verification utilities
 */
export async function verifyDashboardLayout(page: Page, isAdmin = false) {
  // Core layout verification
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator(".url-menu")).toBeVisible();

  // Role-specific elements
  if (isAdmin) {
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  // Responsive design check
  await verifyResponsiveLayout(page);
}

export async function verifyResponsiveLayout(page: Page) {
  if (page.viewportSize()?.width! < 768) {
    await expect(page.locator(".url-menu")).toHaveClass(/collapsed/);
    await expect(page.locator('button[aria-label="Toggle Menu"]')).toBeVisible();
  }
}

/**
 * Settings management utilities
 */
export async function configureThemeAndLayout(page: Page) {
  // Theme preferences
  await page.click('[aria-label="Dark Theme"]');
  await expect(page.locator("body")).toHaveClass(/dark/);

  // Layout preferences
  await page.click('[aria-label="Top Menu"]');
  await expect(page.locator("nav")).toHaveClass(/top/);
}

export async function verifyPreferencePersistence(page: Page) {
  // Verify preferences persist
  await expect(page.locator("body")).toHaveClass(/dark/);
  await expect(page.locator("nav")).toHaveClass(/top/);
}

/**
 * URL management utilities
 */
export async function createUrlGroup(page: Page, name: string, description: string) {
  await page.click('button:has-text("New Group")');
  await page.fill('[name="groupName"]', name);
  await page.fill('[name="description"]', description);
  await page.click('button:has-text("Create")');

  // Verify group creation
  await expect(page.getByText(name)).toBeVisible();
}

export async function addUrlToGroup(page: Page, title: string, url: string) {
  await page.click('button:has-text("Add URL")');
  await page.fill('[name="title"]', title);
  await page.fill('[name="url"]', url);
  await page.click('button:has-text("Add")');

  // Verify URL addition
  await expect(page.getByText(title)).toBeVisible();
}

export async function verifyUrlGroups(page: Page, groups: typeof TEST_DATA.groups) {
  for (const group of Object.values(groups)) {
    // Open group
    await page.click(`text=${group.name}`);

    // Verify group content
    await expect(page.getByText(group.description)).toBeVisible();

    // Check URLs
    for (const url of group.urls) {
      await expect(page.getByText(url.title)).toBeVisible();
    }
  }
}

/**
 * Error handling utilities
 */
export async function testOfflineMode(page: Page, testUrl: string) {
  // Simulate offline state
  await page.context().setOffline(true);

  // Try to load URL
  await page.click(`text=${testUrl}`);
  await expect(page.getByText("Offline Mode")).toBeVisible();

  // Restore online state
  await page.context().setOffline(false);
  await page.reload();
}

/**
 * Form validation utilities
 */
export async function validateFormField(
  page: Page,
  fieldName: string,
  invalidValue: string,
  errorMessage: string,
) {
  await page.fill(`[name="${fieldName}"]`, invalidValue);
  await page.click('button[type="submit"]');
  await expect(page.getByText(errorMessage)).toBeVisible();
}

/**
 * Navigation utilities
 */
export async function navigateAndVerify(page: Page, path: string, expectedHeading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible();
}
