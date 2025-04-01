import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Smoke test', () => {
  it('testing environment works', () => {
    render(<div>Test Component</div>)
    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })

  it('can handle async operations', async () => {
    const result = await Promise.resolve(true)
    expect(result).toBe(true)
  })
})
