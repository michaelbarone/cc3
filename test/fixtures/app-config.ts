import { AppConfig } from "@prisma/client";

export function createMockAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  const now = new Date();
  return {
    id: "app-config",
    appName: "Test App",
    appLogo: null,
    favicon: null,
    loginTheme: "dark",
    registrationEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
