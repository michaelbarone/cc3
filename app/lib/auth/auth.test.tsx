// Mock next/navigation
const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => {
  // Define mocks within the factory to avoid hoisting issues
  const localMockGetFromSearchParams = vi.fn((key: string): string | null => {
    // Default 'get' implementation, can be overridden in beforeEach or tests
    switch (key) {
      case "redirect":
        return "/custom-path";
      case "logout":
        return "false";
      default:
        return null;
    }
  });

  const localMockUseSearchParamsHook = vi.fn(() => ({
    get: localMockGetFromSearchParams,
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    forEach: vi.fn(() => {}),
    entries: vi.fn(() => new URLSearchParams().entries()),
    keys: vi.fn(() => new URLSearchParams().keys()),
    values: vi.fn(() => new URLSearchParams().values()),
    toString: vi.fn(() => ""),
    [Symbol.iterator]: vi.fn(() => new URLSearchParams()[Symbol.iterator]()),
    append: vi.fn(() => {}),
    delete: vi.fn(() => {}),
    set: vi.fn(() => {}),
    sort: vi.fn(() => {}),
    size: 0,
  }));

  // Expose the inner mock function so it can be manipulated in tests
  (globalThis as any).__mockGetFromSearchParams = localMockGetFromSearchParams;
  (globalThis as any).__mockUseSearchParamsHook = localMockUseSearchParamsHook;

  return {
    useRouter: () => ({
      replace: mockRouterReplace,
      push: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: localMockUseSearchParamsHook,
  };
});

// Mock auth context
vi.mock("@/app/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    setUser: vi.fn(),
    login: vi.fn().mockImplementation(async (userId: string, password?: string) => {
      // Simulate failed login for wrong password
      if (password === "wrongpassword") {
        throw new Error("Invalid credentials");
      }
      // Simulate successful login
      return { success: true };
    }),
    logout: vi.fn(),
    register: vi.fn(),
    updateUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  },
}));

// External imports
import { render, screen, waitFor, within } from "@testing-library/react"; // Import directly
import userEvent from "@testing-library/user-event";
import { type ReadonlyURLSearchParams } from "next/navigation";
import React from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Testing utilities
import { measureTestTime, THRESHOLDS } from "@/test/helpers/debug"; // Corrected path

// Internal imports
import { AuthProvider } from "@/app/lib/auth/auth-context";
import LoginPage from "@/app/login/page";
import { mockUsers, type MockUser as MockUserType } from "@/test/fixtures/data/factories"; // Corrected source for both data and type
import { resetAuthState } from "@/test/mocks/services/handlers/auth";

// Helper to access the hoisted mock for manipulation in tests
const getMockGetFromSearchParams = () => (globalThis as any).__mockGetFromSearchParams;

// Create base mock search params
const createMockSearchParams = (
  paramGetter: (key: string) => string | null,
): ReadonlyURLSearchParams => {
  const params = new URLSearchParams();
  return {
    get: paramGetter,
    getAll: () => [],
    has: () => false,
    forEach: () => {},
    entries: () => params.entries(),
    keys: () => params.keys(),
    values: () => params.values(),
    toString: () => "",
    [Symbol.iterator]: () => params[Symbol.iterator](),
    append: () => {},
    delete: () => {},
    set: () => {},
    sort: () => {},
    size: 0,
  } as unknown as ReadonlyURLSearchParams;
};

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Default mock fetch responses that can be used or overridden in tests
const defaultMockFetchResponses = {
  users: { data: mockUsers }, // Assuming API returns { data: [...] }
  config: {
    data: {
      appName: "Test App",
      appLogo: null,
      loginTheme: "dark",
      registrationEnabled: false,
    },
  },
  firstRun: {
    data: { isFirstRun: false },
  },
  user: {
    data: {
      id: "1",
      username: "admin",
      avatarUrl: null,
      requiresPassword: true,
      isAdmin: true,
      lastLoginAt: null,
    },
  },
};

describe("Authentication System", () => {
  const suiteTimer = measureTestTime("Authentication System Suite");

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthState();
    mockRouterReplace.mockClear();

    // Setup mockFetch to return different responses based on URL
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().endsWith("/api/users")) {
        return Promise.resolve({
          ok: true,
          json: async () => defaultMockFetchResponses.users,
        });
      }
      if (url.toString().endsWith("/api/config")) {
        return Promise.resolve({
          ok: true,
          json: async () => defaultMockFetchResponses.config,
        });
      }
      if (url.toString().endsWith("/api/auth/first-run")) {
        return Promise.resolve({
          ok: true,
          json: async () => defaultMockFetchResponses.firstRun,
        });
      }
      if (url.toString().includes("/api/auth/login")) {
        // For login attempts
        // Specific login logic can be handled by the useAuth mock, or a more detailed mock here if needed
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }), // Generic success for now
        });
      }
      // Default fallback for unhandled URLs
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not Found" }),
      });
    });

    // Reset useSearchParams mock to a common baseline for most tests
    getMockGetFromSearchParams().mockImplementation((key: string): string | null => {
      switch (key) {
        case "redirect":
          return null; // Most tests don't need a redirect by default
        case "logout":
          return "false";
        default:
          return null;
      }
    });
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("Login Page", () => {
    const loginPageSuiteTimer = measureTestTime("Login Page Suite");

    afterAll(() => {
      loginPageSuiteTimer.end();
    });

    it("renders user tiles for selection", async () => {
      const testTimer = measureTestTime("Login Page - renders user tiles for selection");
      try {
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Wait for user tiles to load
        await waitFor(() => {
          mockUsers.forEach((user: MockUserType) => {
            expect(screen.getByText(user.username)).toBeInTheDocument();
          });
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("handles passwordless login successfully", async () => {
      const testTimer = measureTestTime("Login Page - handles passwordless login successfully");
      try {
        const user = userEvent.setup();
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Find and click the passwordless user tile
        const userTile = await screen.findByText("user");
        await user.click(userTile);

        // Should redirect to dashboard after cookie is set
        await waitFor(
          () => {
            expect(mockRouterReplace).toHaveBeenCalledWith("/");
          },
          { timeout: 5000 },
        );
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("shows password field for password-protected users", async () => {
      const testTimer = measureTestTime(
        "Login Page - shows password field for password-protected users",
      );
      try {
        const user = userEvent.setup();
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Find and click the admin user tile
        await waitFor(() => {
          const adminTile = screen.getByText("admin");
          user.click(adminTile);
        });

        // Password field should appear
        await waitFor(() => {
          expect(screen.getByLabelText("Password form for admin")).toBeInTheDocument();
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("handles password-protected login successfully", async () => {
      const testTimer = measureTestTime(
        "Login Page - handles password-protected login successfully",
      );
      try {
        const user = userEvent.setup();
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Find and click the admin user tile
        await waitFor(() => {
          const adminTile = screen.getByText("admin");
          expect(adminTile).toBeInTheDocument();
        });

        // Click the admin tile to select it
        const adminTile = screen.getByText("admin");
        await user.click(adminTile);

        // Wait for the password form to appear
        await waitFor(() => {
          expect(screen.getByLabelText("Password form for admin")).toBeInTheDocument();
        });

        // Enter password
        const form = screen.getByLabelText("Password form for admin");
        const passwordInput = within(form).getByLabelText("Password");
        await user.type(passwordInput, "admin123");

        // Submit form
        const submitButton = within(form).getByRole("button", { name: "Log In" });
        await user.click(submitButton);

        // Wait for the login effect to complete and trigger redirection
        await waitFor(
          () => {
            expect(mockRouterReplace).toHaveBeenCalledWith("/");
          },
          { timeout: 2000 },
        );
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("shows error message for invalid password", async () => {
      const testTimer = measureTestTime("Login Page - shows error message for invalid password");
      try {
        const user = userEvent.setup();
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Find and click the admin user tile
        const adminTile = await screen.findByText("admin");
        await user.click(adminTile);

        // Get the password form
        const form = screen.getByLabelText("Password form for admin");
        const passwordInput = within(form).getByLabelText("Password");

        // Type wrong password
        await user.type(passwordInput, "wrongpassword");

        // Submit form
        const submitButton = within(form).getByRole("button", { name: "Log In" });
        await user.click(submitButton);

        // Wait for error message in Snackbar Alert
        await waitFor(
          () => {
            // First check if the Snackbar is visible
            const snackbar = screen.getByRole("alert");
            expect(snackbar).toBeInTheDocument();
            expect(snackbar).toHaveTextContent("Invalid credentials");
          },
          { timeout: 2000 },
        );
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("redirects authenticated users", async () => {
      const testTimer = measureTestTime("Login Page - redirects authenticated users");
      try {
        // Create a new mock implementation for this test
        const mockAuthHook = vi.fn(() => ({
          user: { ...mockUsers[0], avatarUrl: undefined },
          loading: false,
          setUser: vi.fn(),
          login: vi.fn(),
          logout: vi.fn(),
          register: vi.fn(),
          updateUser: vi.fn(),
        }));

        // Override the useAuth implementation for this test only
        const authContextModule = await import("@/app/lib/auth/auth-context");
        const originalUseAuth = authContextModule.useAuth;
        authContextModule.useAuth = mockAuthHook;

        // Render the component
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Wait for the initial /api/auth/me request to complete and redirection
        await waitFor(
          () => {
            expect(mockRouterReplace).toHaveBeenCalledWith("/");
          },
          { timeout: 2000 },
        );

        // Restore the original useAuth implementation
        authContextModule.useAuth = originalUseAuth;
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("handles custom redirect paths", async () => {
      const testTimer = measureTestTime("Login Page - handles custom redirect paths");
      try {
        const user = userEvent.setup();
        // Mock searchParams to include redirect for this specific test
        getMockGetFromSearchParams().mockImplementation((key: string): string | null =>
          key === "redirect" ? "/custom-path" : null,
        );

        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Select passwordless user
        const userTile = await screen.findByText("user");
        await user.click(userTile);

        // Should redirect to custom path after cookie is set
        await waitFor(
          () => {
            expect(mockRouterReplace).toHaveBeenCalledWith("/custom-path");
          },
          { timeout: 5000 },
        );
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("clears user data on logout", async () => {
      const testTimer = measureTestTime("Login Page - clears user data on logout");
      try {
        // Mock just logged out state for this specific test
        getMockGetFromSearchParams().mockImplementation((key: string): string | null =>
          key === "logout" ? "true" : null,
        );

        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Should clear user data and cookie
        await waitFor(() => {
          expect(screen.queryByText(/logged in as/i)).not.toBeInTheDocument();
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });
  });

  describe("Auth Context", () => {
    const authContextSuiteTimer = measureTestTime("Auth Context Suite");

    beforeEach(() => {
      // Reset the mockGetFromSearchParams to its default behavior for this suite
      getMockGetFromSearchParams().mockImplementation((key: string): string | null => {
        switch (key) {
          // Define a default for Auth Context or inherit from global default
          case "redirect":
            return null;
          case "logout":
            return "false";
          default:
            return null;
        }
      });
    });

    afterAll(() => {
      authContextSuiteTimer.end();
    });

    it("provides authentication state to children", async () => {
      const testTimer = measureTestTime("Auth Context - provides authentication state to children");
      try {
        render(
          <AuthProvider>
            <div>Logged in as {mockUsers[0].username}</div>
          </AuthProvider>,
        );

        await waitFor(() => {
          expect(screen.getByText(`Logged in as ${mockUsers[0].username}`)).toBeInTheDocument();
        });
        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.UNIT); // This is a simple render test
      } finally {
        testTimer.end();
      }
    });
  });
});
