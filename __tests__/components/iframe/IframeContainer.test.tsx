import IframeContainer, { IframeContainerRef, resetGlobalContainer } from '@/app/components/iframe/IframeContainer'
import { IframeProvider } from '@/app/components/iframe/state/IframeContext'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../mocks/server'

// Mock Material UI's useMediaQuery
vi.mock('@mui/material', () => ({
  useMediaQuery: vi.fn().mockReturnValue(false),
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

// Define the props type based on the component interface
type UrlGroups = {
  id: string;
  urls: {
    id: string;
    url: string;
    urlMobile?: string | null;
    idleTimeoutMinutes?: number;
  }[];
}[];

// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia for useMediaQuery
const mockMatchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Setup mocks before tests
beforeAll(() => {
  window.ResizeObserver = mockResizeObserver
  window.matchMedia = mockMatchMedia
})

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
  resetGlobalContainer()
  vi.useRealTimers()
})

// Test wrapper component
function TestComponent({ urlGroups = [] }: { urlGroups: UrlGroups }) {
  const iframeRef = useRef<IframeContainerRef>(null)
  return (
    <IframeProvider activeUrlId="url1">
      <IframeContainer ref={iframeRef} urlGroups={urlGroups} />
    </IframeProvider>
  )
}

describe('IframeContainer', () => {
  const mockUrlGroups: UrlGroups = [
    {
      id: 'group1',
      urls: [
        {
          id: 'url1',
          url: 'https://example.com/1',
          urlMobile: 'https://m.example.com/1'
        }
      ]
    }
  ]

  beforeEach(() => {
    // Mock iframe behavior
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'iframe') {
        // Store the src value
        let srcValue = ''

        // Override src property
        Object.defineProperty(element, 'src', {
          get: () => srcValue,
          set: (value) => {
            srcValue = value
            // Simulate successful load after a short delay
            setTimeout(() => {
              element.dispatchEvent(new Event('load'))
            }, 0)
          },
          configurable: true
        })
      }
      return element
    })

    // Add MSW handlers for iframe URLs
    server.use(
      http.get('https://example.com/*', () => {
        return new HttpResponse('<html><body>Mock iframe content</body></html>', {
          headers: {
            'Content-Type': 'text/html',
          },
        })
      }),
      http.get('https://m.example.com/*', () => {
        return new HttpResponse('<html><body>Mock mobile iframe content</body></html>', {
          headers: {
            'Content-Type': 'text/html',
          },
        })
      })
    )
  })

  it('should create iframes for all URLs in urlGroups', async () => {
    render(<TestComponent urlGroups={mockUrlGroups} />)

    await waitFor(() => {
      const container = document.getElementById('global-iframe-container')
      expect(container).toBeTruthy()
      const iframes = container?.querySelectorAll('iframe')
      expect(iframes?.length).toBe(1)
    })
  })

  it('should handle iframe load events', async () => {
    const onLoad = vi.fn()

    render(
      <IframeProvider activeUrlId="url1">
        <IframeContainer
          urlGroups={mockUrlGroups}
          onLoad={onLoad}
        />
      </IframeProvider>
    )

    await waitFor(() => {
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        fireEvent.load(iframe)
      })
      expect(onLoad).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle iframe error events', async () => {
    const onError = vi.fn()

    render(
      <IframeProvider activeUrlId="url1">
        <IframeContainer
          urlGroups={mockUrlGroups}
          onError={onError}
        />
      </IframeProvider>
    )

    await waitFor(() => {
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        fireEvent.error(iframe)
      })
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })

  it('should expose control methods via ref', async () => {
    const TestComponent = () => {
      const ref = useRef<IframeContainerRef>(null)

      return (
        <IframeProvider activeUrlId="url1">
          <IframeContainer
            ref={ref}
            urlGroups={mockUrlGroups}
          />
          <button onClick={() => ref.current?.resetIframe('url1')}>Reset</button>
          <button onClick={() => ref.current?.unloadIframe('url1')}>Unload</button>
          <button onClick={() => ref.current?.reloadUnloadedIframe('url1')}>Reload</button>
        </IframeProvider>
      )
    }

    render(<TestComponent />)

    await waitFor(() => {
      const iframes = document.querySelectorAll('iframe')
      expect(iframes.length).toBe(1)
    })

    // Test reset functionality
    const resetButton = screen.getByText('Reset')
    fireEvent.click(resetButton)

    // Test unload functionality
    const unloadButton = screen.getByText('Unload')
    fireEvent.click(unloadButton)

    // Test reload functionality
    const reloadButton = screen.getByText('Reload')
    fireEvent.click(reloadButton)
  })

  it('should handle mobile URLs when on mobile viewport', async () => {
    // Mock mobile viewport
    mockMatchMedia.mockImplementation(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<TestComponent urlGroups={mockUrlGroups} />)

    await waitFor(() => {
      const iframes = document.querySelectorAll('iframe')
      const mobileIframe = iframes[0]
      expect(mobileIframe.getAttribute('data-src')).toBe('https://m.example.com/1')
    })
  })

  it('should update iframe visibility based on active URL', async () => {
    render(<TestComponent urlGroups={mockUrlGroups} />)

    await waitFor(() => {
      const containers = document.querySelectorAll('[data-iframe-container]')
      expect(containers[0]).toHaveStyle({ visibility: 'hidden' })
    })
  })

  it('should cleanup iframes on unmount', async () => {
    const { unmount } = render(<TestComponent urlGroups={mockUrlGroups} />)

    await waitFor(() => {
      const container = document.getElementById('global-iframe-container')
      expect(container).toBeTruthy()
    })

    unmount()

    // The global container should persist as it's managed outside React
    const container = document.getElementById('global-iframe-container')
    expect(container).toBeTruthy()
  })
})
