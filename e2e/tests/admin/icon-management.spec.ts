import { expect, test } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { loginAsAdmin } from "../../helpers/auth";
import { setupTestDatabase } from "../../helpers/db";

test.describe("Icon Management", () => {
  const TEST_ASSETS_DIR = path.join(process.cwd(), "e2e", "test-assets");
  const TEST_ICON_PATH = path.join(TEST_ASSETS_DIR, "test-icon.png");
  const LARGE_ICON_PATH = path.join(TEST_ASSETS_DIR, "large-icon.png");
  const INVALID_FILE_PATH = path.join(TEST_ASSETS_DIR, "not-an-image.txt");

  test.beforeAll(async () => {
    // Ensure test assets directory exists
    await fs.mkdir(TEST_ASSETS_DIR, { recursive: true });

    // Create test files if they don't exist
    if (!(await fs.stat(TEST_ICON_PATH).catch(() => false))) {
      // Create a small test PNG
      const smallBuffer = Buffer.alloc(100 * 100 * 4); // 100x100 RGBA
      await fs.writeFile(TEST_ICON_PATH, smallBuffer);
    }

    if (!(await fs.stat(LARGE_ICON_PATH).catch(() => false))) {
      // Create a large test PNG (2MB)
      const largeBuffer = Buffer.alloc(2 * 1024 * 1024);
      await fs.writeFile(LARGE_ICON_PATH, largeBuffer);
    }

    if (!(await fs.stat(INVALID_FILE_PATH).catch(() => false))) {
      // Create an invalid file
      await fs.writeFile(INVALID_FILE_PATH, "Not an image");
    }

    await setupTestDatabase();
  });

  test.beforeEach(async ({ page }) => {
    // Add delay before login to avoid rate limiting
    await page.waitForTimeout(2000);
    await loginAsAdmin(page);
    await page.goto("/admin/icons", { timeout: 60000 });
    // Wait for the page to be ready
    await expect(page.locator('h1:has-text("Icon Management")')).toBeVisible({ timeout: 60000 });
  });

  test("handles icon upload successfully", async ({ page }) => {
    // Wait for and click upload button
    const uploadButton = page.getByRole("button", { name: "Upload Icon" });
    await expect(uploadButton).toBeVisible({ timeout: 60000 });

    // Use file chooser to upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploadButton.click(),
    ]);
    await fileChooser.setFiles(TEST_ICON_PATH);

    // Verify success message
    await expect(page.getByText("Icon uploaded successfully")).toBeVisible({ timeout: 60000 });

    // Verify icon appears in list
    await expect(page.getByAltText("test-icon")).toBeVisible({ timeout: 60000 });
  });

  test("validates icon file size and type", async ({ page }) => {
    // Wait for and click upload button
    const uploadButton = page.getByRole("button", { name: "Upload Icon" });
    await expect(uploadButton).toBeVisible({ timeout: 60000 });

    // Test large file
    const [largeFileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploadButton.click(),
    ]);
    await largeFileChooser.setFiles(LARGE_ICON_PATH);

    // Verify error message
    await expect(page.getByText("File too large (max 1MB)")).toBeVisible({ timeout: 60000 });

    // Test invalid file type
    const [invalidFileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploadButton.click(),
    ]);
    await invalidFileChooser.setFiles(INVALID_FILE_PATH);

    // Verify error message
    await expect(page.getByText("File must be an image")).toBeVisible({ timeout: 60000 });
  });

  test("handles icon deletion", async ({ page }) => {
    // Upload an icon first
    const uploadButton = page.getByRole("button", { name: "Upload Icon" });
    await expect(uploadButton).toBeVisible({ timeout: 60000 });

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploadButton.click(),
    ]);
    await fileChooser.setFiles(TEST_ICON_PATH);

    // Wait for upload to complete
    await expect(page.getByText("Icon uploaded successfully")).toBeVisible({ timeout: 60000 });

    // Delete the icon
    const deleteButton = page.getByRole("button", { name: "Delete Icon" });
    await expect(deleteButton).toBeVisible({ timeout: 60000 });
    await deleteButton.click();

    const confirmButton = page.getByRole("button", { name: "Confirm" });
    await expect(confirmButton).toBeVisible({ timeout: 60000 });
    await confirmButton.click();

    // Verify success message
    await expect(page.getByText("Icon deleted successfully")).toBeVisible({ timeout: 60000 });

    // Verify icon is removed from list
    await expect(page.getByAltText("test-icon")).not.toBeVisible({ timeout: 60000 });
  });

  test("prevents unauthorized access", async ({ page }) => {
    // Logout
    const logoutButton = page.getByRole("button", { name: "Logout" });
    await expect(logoutButton).toBeVisible({ timeout: 60000 });
    await logoutButton.click();

    // Try to access icon management
    await page.goto("/admin/icons", { timeout: 60000 });

    // Should be redirected to login
    await expect(page).toHaveURL("/login", { timeout: 60000 });

    // Login as non-admin user
    const usernameField = page.getByLabel("Username");
    const passwordField = page.getByLabel("Password");
    const loginButton = page.getByRole("button", { name: "Login" });

    await expect(usernameField).toBeVisible({ timeout: 60000 });
    await expect(passwordField).toBeVisible({ timeout: 60000 });
    await expect(loginButton).toBeVisible({ timeout: 60000 });

    await usernameField.fill("regular-user");
    await passwordField.fill("password123");
    await loginButton.click();

    // Try to access icon management again
    await page.goto("/admin/icons", { timeout: 60000 });

    // Should be redirected to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 60000 });
  });

  test("handles network errors gracefully", async ({ page }) => {
    // Simulate offline state
    await page.route("**/api/admin/icons/**", (route) => {
      route.abort("failed");
    });

    // Wait for and click upload button
    const uploadButton = page.getByRole("button", { name: "Upload Icon" });
    await expect(uploadButton).toBeVisible({ timeout: 60000 });

    // Try to upload icon
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploadButton.click(),
    ]);
    await fileChooser.setFiles(TEST_ICON_PATH);

    // Verify error message
    await expect(page.getByText("Failed to upload icon")).toBeVisible({ timeout: 60000 });
  });
});
