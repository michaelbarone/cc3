import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

// Create a simple test component
const TestButton = ({ onClick = () => {} }) => (
  <button
    onClick={onClick}
    aria-label="Test button"
  >
    Click me
  </button>
)

describe('Smoke test', () => {
  it('testing environment works', () => {
    render(<div>Test Component</div>)
    expect(screen.getByText('Test Component')).toBeDefined()
  })

  it('can handle async operations', async () => {
    const result = await Promise.resolve(true)
    expect(result).toBe(true)
  })

  it('renders accessible components correctly', () => {
    render(<TestButton />)

    // Test rendering
    const button = screen.getByRole('button')
    expect(button).toBeDefined()
    expect(screen.getByText('Click me')).toBeDefined()

    // Test accessibility
    expect(button.getAttribute('aria-label')).toBe('Test button')
  })

  it('handles user interactions correctly', async () => {
    // Setup user event
    const user = userEvent.setup()
    const handleClick = vi.fn()

    // Render with click handler
    render(<TestButton onClick={handleClick} />)

    // Click the button
    await user.click(screen.getByRole('button'))

    // Verify the handler was called
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
