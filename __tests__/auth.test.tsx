import { describe, expect, it } from 'vitest'
import { mockUsers } from './mocks/data/users'
import { render, screen } from './utils/test-utils'

// Mock component for testing auth
function TestAuthComponent() {
  return <div>Logged in as {mockUsers[0].username}</div>
}

describe('Auth System', () => {
  it('renders auth component with mock data', () => {
    render(<TestAuthComponent />)
    expect(screen.getByText(`Logged in as ${mockUsers[0].username}`)).toBeInTheDocument()
  })
})
