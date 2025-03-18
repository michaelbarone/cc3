import { setupServer } from 'msw/node'
import { authHandlers } from './handlers/auth'
import { urlHandlers } from './handlers/urls'
import { userHandlers } from './handlers/users'

// Create test server instance with all handlers
export const server = setupServer(
  ...authHandlers,
  ...urlHandlers,
  ...userHandlers
)
