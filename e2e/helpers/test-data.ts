/**
 * Test data and data generation utilities for E2E tests
 */

export const TEST_DATA = {
  users: {
    admin: {
      username: "admin",
      password: "admin-password",
      email: "admin@example.com",
    },
    regular: {
      username: "test-user",
      password: "test-password",
      email: "test@example.com",
    },
    new: {
      username: "newuser",
      password: "Password123!",
      email: "newuser@example.com",
      displayName: "New User",
    },
  },
  groups: {
    development: {
      name: "Development",
      description: "Development related links",
      urls: [
        {
          title: "GitHub Dashboard",
          url: "https://github.com",
        },
        {
          title: "Documentation",
          url: "https://docs.example.com",
        },
      ],
    },
    monitoring: {
      name: "Monitoring",
      description: "System monitoring links",
      urls: [
        {
          title: "Grafana",
          url: "https://grafana.example.com",
        },
        {
          title: "Prometheus",
          url: "https://prometheus.example.com",
        },
      ],
    },
  },
  settings: {
    themes: ["light", "dark"],
    menuPositions: ["top", "left"],
    languages: ["en", "es", "fr"],
  },
};

/**
 * Data generation utilities
 */
export function generateUniqueUsername(base = "user"): string {
  return `${base}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function generateUniqueEmail(username: string): string {
  return `${username}@example.com`;
}

export function generateUniqueGroupName(base = "Group"): string {
  return `${base}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function generateTestUrl(base = "https://example.com"): string {
  return `${base}/test-${Date.now()}`;
}

/**
 * Test data management
 */
export function getTestUser(role: "admin" | "regular" | "new" = "regular") {
  return TEST_DATA.users[role];
}

export function getTestGroup(type: "development" | "monitoring") {
  return TEST_DATA.groups[type];
}

export function getRandomSetting(type: keyof typeof TEST_DATA.settings) {
  const settings = TEST_DATA.settings[type];
  return settings[Math.floor(Math.random() * settings.length)];
}
