import { AuthProvider } from '@/app/lib/auth/auth-context'
import LoginPage from '@/app/login/page'
import userEvent from '@testing-library/user-event'
import { useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockUsers } from './mocks/data/users'
import { fireEvent, render, screen, waitFor } from './utils/test-utils'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => createMockSearchParams(() => null)
}))

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Page', () => {
    it('renders user tiles for selection', async () => {
      render(<LoginPage />)

      // Wait for user tiles to load
      await waitFor(() => {
        mockUsers.forEach(user => {
          expect(screen.getByText(user.username)).toBeInTheDocument()
        })
      })
    })

    it('handles passwordless login successfully', async () => {
      render(<LoginPage />)

      // Find and click the passwordless user tile
      await waitFor(() => {
        const userTile = screen.getByText('user')
        fireEvent.click(userTile)
      })

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('shows password field for password-protected users', async () => {
      render(<LoginPage />)

      // Find and click the admin user tile
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        fireEvent.click(adminTile)
      })

      // Password field should appear
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('handles password-protected login successfully', async () => {
      render(<LoginPage />)

      // Select admin user
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        fireEvent.click(adminTile)
      })

      // Enter correct password
      const passwordInput = screen.getByLabelText(/password/i)
      await userEvent.type(passwordInput, 'admin123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /login/i })
      fireEvent.click(submitButton)

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('shows error message for invalid password', async () => {
      render(<LoginPage />)

      // Select admin user
      await waitFor(() => {
        const adminTile = screen.getByText('admin')
        fireEvent.click(adminTile)
      })

      // Enter wrong password
      const passwordInput = screen.getByLabelText(/password/i)
      await userEvent.type(passwordInput, 'wrongpassword')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /login/i })
      fireEvent.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument()
      })
    })

    it('redirects authenticated users', async () => {
      // Mock user already logged in
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/')
      })
    })

    it('handles custom redirect paths', async () => {
      // Mock searchParams to include redirect
      vi.mocked(useSearchParams).mockImplementation(() =>
        createMockSearchParams(() => '/custom-path')
      )

      render(<LoginPage />)

      // Select passwordless user
      await waitFor(() => {
        const userTile = screen.getByText('user')
        fireEvent.click(userTile)
      })

      // Should redirect to custom path
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-path')
      })
    })

    it('clears user data on logout', async () => {
      // Mock just logged out state
      vi.mocked(useSearchParams).mockImplementation(() =>
        createMockSearchParams((param) => param === 'logout' ? 'true' : null)
      )

      render(<LoginPage />)

      // Should clear user data
      await waitFor(() => {
        expect(screen.queryByText(/logged in as/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Auth Context', () => {
    it('provides authentication state to children', () => {
      render(
        <AuthProvider>
          <div>Logged in as {mockUsers[0].username}</div>
        </AuthProvider>
      )

      expect(screen.getByText(`Logged in as ${mockUsers[0].username}`)).toBeInTheDocument()
    })
  })
})
