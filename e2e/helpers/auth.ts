import { Page } from "@playwright/test";

export async function login(page: Page, username: string, password?: string) {
  await page.goto("/login");

  // Click the user tile with the specified username
  await page.click(`text=${username}`);

  // If password is provided, enter it
  if (password) {
    await page.fill('[type="password"]', password);
    await page.click('button:has-text("Login")');
  }

  // Wait for redirect to complete
  await page.waitForURL("/dashboard");
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin", "admin-password");
}

export async function logout(page: Page) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL("/login");
}
