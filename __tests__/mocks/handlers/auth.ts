import { http, HttpResponse } from 'msw'
import { MockUser, mockUsers } from '../data/users'

type LoginRequest = {
  username: string
  password?: string
}

export const authHandlers = [
  // Mock login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password }: LoginRequest = await request.json()
    const user = mockUsers.find((u: MockUser) => u.username === username)

    if (!user) {
      return new HttpResponse(null, { status: 401 })
    }

    if (user.password_hash && password !== user.password) {
      return new HttpResponse(null, { status: 401 })
    }

    return HttpResponse.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }
    })
  }),

  // Mock session endpoint
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: mockUsers[0] // Return first user as logged in for tests
    })
  })
]
