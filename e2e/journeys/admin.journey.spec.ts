import { test as base, expect } from "@playwright/test";
import { loginAsAdmin, logout } from "../helpers/auth";
import { setupTestDatabase } from "../helpers/db";
import {
  addUrlToGroup,
  configureThemeAndLayout,
  createUrlGroup,
  navigateAndVerify,
  validateFormField,
  verifyDashboardLayout,
} from "../helpers/journey-utils";
import { TEST_DATA, generateTestUrl, generateUniqueGroupName } from "../helpers/test-data";

// Extend test with custom fixtures if needed
const test = base.extend<{}>({});

test.describe("Admin User Journey", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("completes full admin configuration journey", async ({ page }) => {
    // 1. Initial Login & Dashboard Verification
    await loginAsAdmin(page);
    await expect(page).toHaveURL("/dashboard");
    await verifyDashboardLayout(page, true);

    // 2. System Configuration
    await test.step("Configure System Settings", async () => {
      await navigateAndVerify(page, "/settings", "System Settings");
      await configureThemeAndLayout(page);

      // Security Settings
      const sections = ["Profile", "Appearance", "Security"];
      for (const section of sections) {
        await expect(page.getByRole("heading", { name: section })).toBeVisible();
      }
    });

    // 3. URL Management
    await test.step("Manage URLs", async () => {
      await navigateAndVerify(page, "/admin/urls", "URL Management");

      const groupName = generateUniqueGroupName("Test");
      await createUrlGroup(page, groupName, "Test Description");

      const testUrl = generateTestUrl();
      await addUrlToGroup(page, "Test URL", testUrl);

      // Test drag and drop
      const urlElement = page.locator('text="Test URL"').first();
      const targetGroup = page.locator(`text="${TEST_DATA.groups.monitoring.name}"`);
      await urlElement.dragTo(targetGroup);
      await expect(targetGroup.locator('text="Test URL"')).toBeVisible();
    });

    // 4. User Management
    await test.step("Manage Users", async () => {
      await navigateAndVerify(page, "/admin/users", "User Management");

      // Create new user
      await page.click('button:has-text("Add User")');
      await page.fill('[name="username"]', "testuser");
      await page.fill('[name="password"]', "testpass123");
      await page.click('button:has-text("Create")');

      await expect(page.getByText("testuser")).toBeVisible();
    });

    // 5. Icon Management
    await test.step("Manage Icons", async () => {
      await navigateAndVerify(page, "/admin/icons", "Icon Management");
      const uploadButton = page.getByRole("button", { name: "Upload Icon" });
      await expect(uploadButton).toBeVisible();
      await expect(uploadButton).toBeEnabled();
    });

    // 6. Cleanup
    await logout(page);
  });

  test("handles error scenarios and edge cases", async ({ page }) => {
    await loginAsAdmin(page);

    await test.step("Test Invalid URL Addition", async () => {
      await navigateAndVerify(page, "/admin/urls", "URL Management");
      await validateFormField(page, "url", "invalid-url", "Invalid URL format");
    });

    await test.step("Test Duplicate Group Creation", async () => {
      const existingGroup = TEST_DATA.groups.development.name;
      await createUrlGroup(page, existingGroup, "Duplicate Description");
      await expect(page.getByText("Group name already exists")).toBeVisible();
    });

    await logout(page);
  });

  test("manages system backup and maintenance", async ({ page }) => {
    await loginAsAdmin(page);

    await test.step("System Maintenance", async () => {
      await navigateAndVerify(page, "/admin/system", "System Maintenance");

      // Test backup creation
      await page.click('button:has-text("Create Backup")');
      await expect(page.getByText("Backup created successfully")).toBeVisible();

      // Test system logs
      await page.click('button:has-text("View Logs")');
      await expect(page.getByRole("table", { name: "System Logs" })).toBeVisible();
    });

    await logout(page);
  });

  test("handles authentication edge cases", async ({ page }) => {
    await test.step("Invalid Credentials", async () => {
      await loginAsAdmin(page, { password: "wrong-password" });
      await expect(page.getByText("Invalid credentials")).toBeVisible();

      // Test non-existent admin
      await loginAsAdmin(page, { username: "non-existent-admin", password: "wrong-password" });
      await expect(page.getByText("User not found")).toBeVisible();
    });

    await test.step("Session Management", async () => {
      await loginAsAdmin(page);

      // Simulate session expiry
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await expect(page).toHaveURL("/login");

      // Test re-authentication after expiry
      await loginAsAdmin(page);
      await expect(page).toHaveURL("/dashboard");
    });

    await test.step("Role-based Access Control", async () => {
      await loginAsAdmin(page);

      // Verify admin-specific elements
      await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
      await expect(page.getByRole("link", { name: "System" })).toBeVisible();

      // Verify access to admin routes
      const adminRoutes = [
        { path: "/admin/users", title: "User Management" },
        { path: "/admin/system", title: "System Maintenance" },
        { path: "/admin/urls", title: "URL Management" },
      ];

      for (const route of adminRoutes) {
        await navigateAndVerify(page, route.path, route.title);
      }
    });

    await logout(page);
  });
});
