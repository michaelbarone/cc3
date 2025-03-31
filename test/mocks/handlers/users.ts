import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'

export const userHandlers = [
  // Mock users list endpoint
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: mockUsers.map(user => ({
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }))
    })
  }),

  // Mock single user endpoint
  http.get('/api/users/:id', ({ params }) => {
    const user = mockUsers.find(u => u.id === params.id)
    if (!user) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json({ user })
  })
]
