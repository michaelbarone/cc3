import { setupServer } from 'msw/node'
import { authHandlers } from './services/handlers/auth'
import { urlHandlers } from './services/handlers/urls'
import { userHandlers } from './services/handlers/users'

// Create test server instance with all handlers
export const server = setupServer(
  ...authHandlers,
  ...urlHandlers,
  ...userHandlers
)
