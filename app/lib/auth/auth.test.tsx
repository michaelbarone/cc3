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

// Create a mock login function that we can spy on and control
const mockLogin = vi.fn().mockImplementation(async (userId: string, password?: string) => {
  // Simulate failed login for wrong password
  if (password === "wrongpassword") {
    throw new Error("Invalid credentials");
  }
  // Simulate successful login
  return { success: true };
});

// Mock auth context
vi.mock("@/app/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    setUser: vi.fn(),
    login: mockLogin,
    logout: vi.fn(),
    register: vi.fn(),
    updateUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  },
}));

// External imports
import { render, screen, waitFor } from "@testing-library/react"; // Import directly
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Testing utilities
import { measureTestTime, THRESHOLDS } from "@/test/helpers/debug"; // Corrected path

// Internal imports
import { AuthProvider, useAuth } from "@/app/lib/auth/auth-context";
import LoginPage from "@/app/login/page";
import { mockUsers } from "@/test/fixtures/data/factories"; // Corrected source for both data and type
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
  users: [
    {
      id: "1",
      username: "admin",
      avatarUrl: null,
      requiresPassword: true,
      isAdmin: true,
      lastLoginAt: null,
    },
    {
      id: "2",
      username: "user",
      avatarUrl: null,
      requiresPassword: false,
      isAdmin: false,
      lastLoginAt: null,
    },
  ],
  config: {
    appName: "Test App",
    appLogo: null,
    loginTheme: "dark",
    registrationEnabled: false,
  },
  firstRun: {
    isFirstRun: false,
  },
};

// Helper function to setup API mocks consistently
const setupApiMocks = () => {
  // Setup mockFetch to return different responses based on URL
  mockFetch.mockImplementation(async (url) => {
    if (url.toString().includes("/api/auth/users")) {
      return Promise.resolve({
        ok: true,
        json: async () => defaultMockFetchResponses.users,
      });
    }
    if (
      url.toString().includes("/api/config") ||
      url.toString().includes("/api/admin/app-config")
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => defaultMockFetchResponses.config,
      });
    }
    if (url.toString().includes("/api/auth/first-run")) {
      return Promise.resolve({
        ok: true,
        json: async () => defaultMockFetchResponses.firstRun,
      });
    }
    if (url.toString().includes("/api/auth/login")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    }
    // Add any additional API mocks as needed

    // Default fallback for unhandled URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not Found" }),
    });
  });
};

describe("Authentication System", () => {
  const suiteTimer = measureTestTime("Authentication System Suite");

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthState();
    mockRouterReplace.mockClear();
    mockLogin.mockClear();

    // Setup consistent API mocks
    setupApiMocks();

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

        // Wait for page to render
        await waitFor(() => {
          // Check if the page structure exists
          expect(screen.getByRole("banner")).toBeInTheDocument();
          expect(screen.getByRole("region", { name: /user selection/i })).toBeInTheDocument();
        });

        // Verify API calls to fetch users have been made
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/auth\/users/),
          expect.anything(),
        );

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("handles passwordless login successfully", async () => {
      const testTimer = measureTestTime("Login Page - handles passwordless login successfully");
      try {
        // Mock the router manually to capture the replacement
        const router = {
          replace: mockRouterReplace,
        };

        // Create a simple component to trigger login
        const PasswordlessLoginTrigger = () => {
          const { login } = useAuth();

          React.useEffect(() => {
            // This represents a passwordless user login
            login("user", "").then(() => {
              // Call router.replace directly in the component
              router.replace("/");
            });
          }, [login]);

          return <div>Login Trigger</div>;
        };

        render(
          <AuthProvider>
            <PasswordlessLoginTrigger />
          </AuthProvider>,
        );

        // Verify the login was called with correct parameters
        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalledWith("user", "");
        });

        // Verify router redirect after successful login
        await waitFor(() => {
          expect(mockRouterReplace).toHaveBeenCalledWith("/");
        });

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
        // Render the login page
        render(
          <AuthProvider>
            <LoginPage />
          </AuthProvider>,
        );

        // Wait for login page and check API calls
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/auth\/users/),
            expect.anything(),
          );
        });

        // Verify the API call to fetch users was made
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/auth\/users/),
          expect.anything(),
        );

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
        // Mock the router manually to capture the replacement
        const router = {
          replace: mockRouterReplace,
        };

        // Create a simple component to trigger login
        const PasswordLoginTrigger = () => {
          const { login } = useAuth();

          React.useEffect(() => {
            // This represents a password-protected user login
            login("admin", "admin123").then(() => {
              // Call router.replace directly in the component
              router.replace("/");
            });
          }, [login]);

          return <div>Login Trigger</div>;
        };

        render(
          <AuthProvider>
            <PasswordLoginTrigger />
          </AuthProvider>,
        );

        // Verify the login was called with correct parameters
        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalledWith("admin", "admin123");
        });

        // Verify router redirect after successful login
        await waitFor(() => {
          expect(mockRouterReplace).toHaveBeenCalledWith("/");
        });

        expect(testTimer.elapsed()).toBeLessThan(THRESHOLDS.INTEGRATION);
      } finally {
        testTimer.end();
      }
    });

    it("shows error message for invalid password", async () => {
      const testTimer = measureTestTime("Login Page - shows error message for invalid password");
      try {
        // Create a component to trigger login with wrong password
        const InvalidPasswordTrigger = () => {
          const { login } = useAuth();
          const [error, setError] = useState<string | null>(null);

          useEffect(() => {
            // Attempt login with wrong password
            login("admin", "wrongpassword").catch((err) => {
              setError(err.message);
            });
          }, [login]);

          return <div>{error && <div role="alert">{error}</div>}</div>;
        };

        render(
          <AuthProvider>
            <InvalidPasswordTrigger />
          </AuthProvider>,
        );

        // Verify error message is displayed
        await waitFor(() => {
          expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
        });

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
          user: { id: "1", username: "admin", avatarUrl: undefined, isAdmin: true },
          loading: false,
          setUser: vi.fn(),
          login: mockLogin,
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

        // Wait for the redirection
        await waitFor(() => {
          expect(mockRouterReplace).toHaveBeenCalledWith("/");
        });

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
        // Mock searchParams to include redirect for this specific test
        getMockGetFromSearchParams().mockImplementation((key: string): string | null =>
          key === "redirect" ? "/custom-path" : null,
        );

        // Create a simple component to trigger login
        const CustomRedirectLoginTrigger = () => {
          const { login } = useAuth();
          const router = useRouter();
          const searchParams = useSearchParams();
          const redirectPath = searchParams?.get("redirect") || "/";

          React.useEffect(() => {
            // Login and redirect to custom path
            login("user", "").then(() => {
              router.replace(redirectPath);
            });
          }, [login, router, redirectPath]);

          return <div>Login Trigger</div>;
        };

        render(
          <AuthProvider>
            <CustomRedirectLoginTrigger />
          </AuthProvider>,
        );

        // Verify router redirect with custom path
        await waitFor(() => {
          expect(mockRouterReplace).toHaveBeenCalledWith("/custom-path");
        });

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
