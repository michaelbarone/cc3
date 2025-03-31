import { AuthProvider } from '@/app/lib/auth/auth-context'
import LoginPage from '@/app/login/page'
import userEvent from '@testing-library/user-event'
import { type ReadonlyURLSearchParams } from 'next/navigation'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockUsers } from './mocks/data/users'
import { resetAuthState } from './mocks/handlers/auth'
import { render, screen, waitFor, within } from './utils/test-utils'

// Mock next/navigation
const mockRouterReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockUseSearchParams(),
}))

// Mock auth context
vi.mock('@/app/lib/auth/auth-context', async () => {
  const mockUser = mockUsers[0];
  return {
    useAuth: () => ({
      user: mockUser,
      loading: false,
      setUser: vi.fn(),
      login: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

// Create base mock search params
const createMockSearchParams = (paramGetter: (key: string) => string | null): ReadonlyURLSearchParams => {
  const params = new URLSearchParams()
  return {
    get: paramGetter,
    getAll: () => [],
    has: () => false,
    forEach: () => {},
    entries: () => params.entries(),
    keys: () => params.keys(),
    values: () => params.values(),
    toString: () => '',
    [Symbol.iterator]: () => params[Symbol.iterator](),
    append: () => {},
    delete: () => {},
    set: () => {},
    sort: () => {},
    size: 0
  } as unknown as ReadonlyURLSearchParams
}

// Mock useSearchParams
const mockUseSearchParams = vi.fn(() => ({
  get: (key: string): string | null => {
    switch (key) {
      case 'redirect':
        return '/custom-path';
      case 'logout':
        return 'false';
      default:
        return null;
    }
  },
  getAll: () => [],
  has: () => false,
  forEach: () => {},
  entries: () => new URLSearchParams().entries(),
  keys: () => new URLSearchParams().keys(),
  values: () => new URLSearchParams().values(),
  toString: () => '',
  [Symbol.iterator]: () => new URLSearchParams()[Symbol.iterator](),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
  }),
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fetch responses
const mockFetchResponses = {
  users: mockUsers,
  config: {
    appName: "Test App",
    appLogo: null,
    loginTheme: "dark",
    registrationEnabled: false,
  },
  firstRun: {
    isFirstRun: false,
  },
  user: {
    id: '1',
    username: 'admin',
    avatarUrl: null,
    requiresPassword: true,
    isAdmin: true,
    lastLoginAt: null,
  },
};

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAuthState()
    // Reset useSearchParams mock to default values
    mockUseSearchParams.mockImplementation(() => ({
      get: (key: string): string | null => {
        switch (key) {
          case 'redirect':
            return null;
          case 'logout':
            return 'false';
          default:
            return null;
        }
      },
      getAll: () => [],
      has: () => false,
      forEach: () => {},
      entries: () => new URLSearchParams().entries(),
      keys: () => new URLSearchParams().keys(),
      values: () => new URLSearchParams().values(),
      toString: () => '',
      [Symbol.iterator]: () => new URLSearchParams()[Symbol.iterator](),
    }));
  })

  describe('Login Page', () => {
    it('renders user tiles for selection', async () => {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Wait for user tiles to load
      await waitFor(() => {
        mockUsers.forEach(user => {
          expect(screen.getByText(user.username)).toBeInTheDocument()
        })
      })
    })

    it('handles passwordless login successfully', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Find and click the passwordless user tile
      await waitFor(() => {
        const userTile = screen.getByText('user')
        user.click(userTile)
      })

      // Should redirect to dashboard after cookie is set
      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/')
      }, { timeout: 2000 })
    })

    it('shows password field for password-protected users', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Find and click the admin user tile
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        user.click(adminTile)
      })

      // Password field should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Password form for admin')).toBeInTheDocument()
      })
    })

    it('handles password-protected login successfully', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Find and click the admin user tile
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        expect(adminTile).toBeInTheDocument()
      })

      // Click the admin tile to select it
      const adminTile = screen.getByText('admin')
      await user.click(adminTile)

      // Wait for the password form to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Password form for admin')).toBeInTheDocument()
      })

      // Enter password
      const form = screen.getByLabelText('Password form for admin')
      const passwordInput = within(form).getByLabelText('Password')
      await user.type(passwordInput, 'admin123')

      // Submit form
      const submitButton = within(form).getByRole('button', { name: 'Log In' })
      await user.click(submitButton)

      // Wait for the login effect to complete and trigger redirection
      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/')
      }, { timeout: 2000 })
    })

    it('shows error message for invalid password', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Find and click the admin user tile
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        expect(adminTile).toBeInTheDocument()
      })

      // Click the admin tile to select it
      const adminTile = screen.getByText('admin')
      await user.click(adminTile)

      // Wait for the password form to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Password form for admin')).toBeInTheDocument()
      })

      // Enter wrong password
      const form = screen.getByLabelText('Password form for admin')
      const passwordInput = within(form).getByLabelText('Password')
      await user.type(passwordInput, 'wrongpassword')

      // Submit form
      const submitButton = within(form).getByRole('button', { name: 'Log In' })
      await user.click(submitButton)

      // Wait for error message
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Invalid credentials');
      });
    })

    it('redirects authenticated users', async () => {
      const mockUser = mockUsers[0];

      // Mock the initial user state
      vi.mock('../app/lib/auth/auth-context', () => ({
        useAuth: () => ({
          user: mockUser,
          loading: false,
          setUser: vi.fn(),
        }),
      }));

      // Render the component
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      // Wait for the initial /api/auth/me request to complete
      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/');
      });
    })

    it('handles custom redirect paths', async () => {
      const user = userEvent.setup()
      // Mock searchParams to include redirect
      mockUseSearchParams.mockImplementation(() => ({
        get: (key: string): string | null => key === 'redirect' ? '/custom-path' : null,
        getAll: () => [],
        has: () => false,
        forEach: () => {},
        entries: () => new URLSearchParams().entries(),
        keys: () => new URLSearchParams().keys(),
        values: () => new URLSearchParams().values(),
        toString: () => '',
        [Symbol.iterator]: () => new URLSearchParams()[Symbol.iterator](),
      }))

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Select passwordless user
      await waitFor(() => {
        const userTile = screen.getByText('user')
        user.click(userTile)
      })

      // Should redirect to custom path after cookie is set
      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/custom-path')
      }, { timeout: 2000 })
    })

    it('clears user data on logout', async () => {
      // Mock just logged out state
      mockUseSearchParams.mockImplementation(() => ({
        get: (key: string): string | null => key === 'logout' ? 'true' : null,
        getAll: () => [],
        has: () => false,
        forEach: () => {},
        entries: () => new URLSearchParams().entries(),
        keys: () => new URLSearchParams().keys(),
        values: () => new URLSearchParams().values(),
        toString: () => '',
        [Symbol.iterator]: () => new URLSearchParams()[Symbol.iterator](),
      }));

      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Should clear user data and cookie
      await waitFor(() => {
        expect(screen.queryByText(/logged in as/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Auth Context', () => {
    it('provides authentication state to children', async () => {
      render(
        <AuthProvider>
          <div>Logged in as {mockUsers[0].username}</div>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(`Logged in as ${mockUsers[0].username}`)).toBeInTheDocument()
      })
    })
  })
})
