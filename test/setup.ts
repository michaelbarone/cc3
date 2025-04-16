import { authHandlers } from '@/test/mocks/services/handlers/auth'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

// Extend Vitest's expect with Testing Library's matchers
import '@testing-library/jest-dom/vitest'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

// Mock ResizeObserver
const mockResizeObserver = vi.fn()
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.ResizeObserver = mockResizeObserver

// Create MSW server with auth handlers
const server = setupServer(...authHandlers)

// Set up test environment before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

// Clean up after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})
