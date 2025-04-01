import { Page, expect } from "@playwright/test";

export async function login(page: Page, username: string, password?: string) {
  // Navigate to login page with longer timeout
  await page.goto("/login", { timeout: 60000 });

  // Wait for the page to be ready
  await expect(
    page.getByRole("heading", { name: "Select your user account to log in" }),
  ).toBeVisible({ timeout: 60000 });

  // Find and click the user card by username
  const userCard = page.locator(`[data-user-id]`).filter({ hasText: username });
  await expect(userCard).toBeVisible({ timeout: 60000 });
  await userCard.click();

  if (password) {
    // Wait for password field and enter password
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible({ timeout: 60000 });
    await passwordField.fill(password);

    // Wait for and click login button with exact text match
    const loginButton = page.getByRole("button", { name: "Log In", exact: true });
    await expect(loginButton).toBeVisible({ timeout: 60000 });
    await loginButton.click();

    // Wait for navigation to complete
    await Promise.race([
      page.waitForURL("/dashboard", { timeout: 60000 }),
      page.waitForURL("/admin", { timeout: 60000 }),
    ]);
  }
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin", "admin-password");
}

export async function logout(page: Page) {
  // Wait for and click logout button
  const logoutButton = page.getByRole("button", { name: "Logout" });
  await expect(logoutButton).toBeVisible({ timeout: 60000 });
  await logoutButton.click();

  // Wait for redirect to login page
  await page.waitForURL("/login", { timeout: 60000 });
}
