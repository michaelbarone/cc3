import { http, HttpResponse } from 'msw'

// Define your API mocks here
export const handlers = [
  // Example handler for authentication
  http.post('/api/auth/login', async () => {
    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token'
    })
  }),

  // Add more handlers as needed
]
