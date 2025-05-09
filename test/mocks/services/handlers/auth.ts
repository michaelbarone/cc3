import { http, HttpResponse } from 'msw'
import { MockUser, mockUsers } from '../data/users'

type LoginRequest = {
  username: string
  password?: string
}

// Track current session
let currentSession: MockUser | null = null

export const authHandlers = [
  // Mock login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const data = await request.json() as LoginRequest
    const { username, password } = data

    // Find user
    const user = mockUsers.find(u => u.username === username)
    if (!user) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check password if required
    if (user.requiresPassword && (!password || password !== user.password)) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Set session
    currentSession = user

    // Successful login
    return HttpResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        avatarUrl: user.avatarUrl,
        requiresPassword: user.requiresPassword,
        lastLoginAt: new Date().toISOString()
      }
    })
  }),

  // Mock users endpoint
  http.get('/api/auth/users', () => {
    return HttpResponse.json(mockUsers.map(user => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      requiresPassword: user.requiresPassword,
      isAdmin: user.isAdmin,
      lastLoginAt: user.lastLoginAt
    })))
  }),

  // Mock first-run endpoint
  http.get('/api/auth/first-run', () => {
    return HttpResponse.json({
      isFirstRun: false
    })
  }),

  // Mock app-config endpoint
  http.get('/api/admin/app-config', () => {
    return HttpResponse.json({
      appName: "Test App",
      appLogo: null,
      loginTheme: "dark",
      registrationEnabled: false
    })
  }),

  // Mock session endpoint
  http.get('/api/auth/session', async () => {
    if (!currentSession) {
      return HttpResponse.json({ user: null });
    }

    return HttpResponse.json({
      success: true,
      user: {
        id: currentSession.id,
        username: currentSession.username,
        isAdmin: currentSession.isAdmin,
        avatarUrl: currentSession.avatarUrl,
        requiresPassword: currentSession.requiresPassword,
        lastLoginAt: new Date().toISOString()
      }
    });
  }),

  // Mock /api/auth/me endpoint
  http.get('/api/auth/me', async () => {
    if (!currentSession) {
      return HttpResponse.json({ user: null });
    }

    return HttpResponse.json({
      success: true,
      user: {
        id: currentSession.id,
        username: currentSession.username,
        isAdmin: currentSession.isAdmin,
        avatarUrl: currentSession.avatarUrl,
        requiresPassword: currentSession.requiresPassword,
        lastLoginAt: new Date().toISOString()
      }
    });
  }),

  // Mock logout endpoint
  http.post('/api/auth/logout', () => {
    currentSession = null
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
      }
    })
  })
]

// Helper to reset session state between tests
export const resetAuthState = () => {
  currentSession = null
}
