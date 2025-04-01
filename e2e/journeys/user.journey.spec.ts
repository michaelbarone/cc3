import { test as base, expect } from "@playwright/test";
import { login, logout } from "../helpers/auth";
import { setupTestDatabase } from "../helpers/db";
import {
  configureThemeAndLayout,
  navigateAndVerify,
  testOfflineMode,
  verifyDashboardLayout,
  verifyPreferencePersistence,
  verifyUrlGroups,
} from "../helpers/journey-utils";
import { TEST_DATA, getTestUser } from "../helpers/test-data";

// Extend test with custom fixtures if needed
const test = base.extend<{}>({});

test.describe("Regular User Journey", () => {
  test.beforeAll(async () => {
    await setupTestDatabase();
  });

  test("completes typical user workflow", async ({ page }) => {
    const user = getTestUser("regular");

    // 1. Login & Initial Navigation
    await test.step("Login and Dashboard Access", async () => {
      await login(page, user.username, user.password);
      await expect(page).toHaveURL("/dashboard");
      await verifyDashboardLayout(page);
    });

    // 2. Dashboard Interaction
    await test.step("Dashboard Interaction", async () => {
      // Test URL group expansion
      await page.click(`text=${TEST_DATA.groups.development.name}`);

      // Verify URLs are visible
      for (const url of TEST_DATA.groups.development.urls) {
        await expect(page.getByText(url.title)).toBeVisible();
      }

      // Test URL opening
      await page.click(`text=${TEST_DATA.groups.development.urls[0].title}`);
      await expect(page.locator("iframe")).toBeVisible();

      // Test search functionality
      await page.fill('[placeholder="Search URLs"]', "GitHub");
      await expect(page.getByText("GitHub Dashboard")).toBeVisible();
    });

    // 3. URL Group Usage
    await test.step("URL Group Navigation", async () => {
      await verifyUrlGroups(page, {
        development: {
          name: TEST_DATA.groups.development.name,
          description: TEST_DATA.groups.development.description,
          urls: TEST_DATA.groups.development.urls.map((url) => ({
            ...url,
            idleTimeoutMinutes: 30,
            urlMobile: url.url,
          })),
        },
        monitoring: {
          name: TEST_DATA.groups.monitoring.name,
          description: TEST_DATA.groups.monitoring.description,
          urls: TEST_DATA.groups.monitoring.urls.map((url) => ({
            ...url,
            idleTimeoutMinutes: 30,
          })),
        },
      });
    });

    // 4. Personal Settings Configuration
    await test.step("Settings Configuration", async () => {
      await navigateAndVerify(page, "/settings", "User Settings");
      await configureThemeAndLayout(page);

      // Profile settings
      await page.click("text=Profile");
      await page.fill('[name="displayName"]', "Updated User");
      await page.click('button:has-text("Save")');
      await expect(page.getByText("Settings saved")).toBeVisible();
    });

    // 5. Cleanup
    await logout(page);
  });

  test("handles user preferences and persistence", async ({ page }) => {
    const user = getTestUser("regular");
    await login(page, user.username, user.password);

    await test.step("Theme and Layout Persistence", async () => {
      await navigateAndVerify(page, "/settings", "User Settings");
      await configureThemeAndLayout(page);

      // Reload page
      await page.reload();
      await verifyPreferencePersistence(page);

      // Test across navigation
      await page.click('a[href="/dashboard"]');
      await verifyPreferencePersistence(page);
    });

    await logout(page);
  });

  test("manages offline and error scenarios", async ({ page }) => {
    const user = getTestUser("regular");
    await login(page, user.username, user.password);

    await test.step("Offline Mode Handling", async () => {
      const testUrl = TEST_DATA.groups.development.urls[0].title;
      await testOfflineMode(page, testUrl);

      // Verify cached content is available
      await expect(page.getByText(TEST_DATA.groups.development.name)).toBeVisible();
    });

    await logout(page);
  });

  test("handles authentication scenarios", async ({ page }) => {
    const user = getTestUser("regular");

    await test.step("Invalid Login Attempts", async () => {
      // Test wrong password
      await login(page, user.username, "wrong-password").catch((error) =>
        expect(error).toBeTruthy(),
      );
      await expect(page.getByText("Invalid credentials")).toBeVisible();

      // Test non-existent user
      await login(page, "nonexistent", "any-password").catch((error) => expect(error).toBeTruthy());
      await expect(page.getByText("User not found")).toBeVisible();
    });

    await test.step("Admin Route Access Prevention", async () => {
      await login(page, user.username, user.password);

      // Verify regular user cannot access admin routes
      const adminRoutes = ["/admin", "/admin/users", "/admin/system", "/admin/urls"];

      for (const route of adminRoutes) {
        await page.goto(route);
        await expect(page.getByText("Access Denied")).toBeVisible();
      }
    });

    await test.step("Session Handling", async () => {
      await login(page, user.username, user.password);
      await expect(page).toHaveURL("/dashboard");

      // Test session expiry
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await expect(page).toHaveURL("/login");

      // Verify re-authentication works
      await login(page, user.username, user.password);
      await expect(page).toHaveURL("/dashboard");
    });

    await logout(page);
  });
});
