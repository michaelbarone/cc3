import IframeContainer, { IframeContainerRef, resetGlobalContainer } from '@/app/components/iframe/IframeContainer'
import { IframeProvider } from '@/app/components/iframe/state/IframeContext'
import { useMediaQuery } from '@mui/material'
import { act, render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    // Reset the global container before each test
    resetGlobalContainer()

    // Mock ResizeObserver
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))

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

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks()
    resetGlobalContainer()
    vi.useRealTimers()
  })

  it('creates iframes for all URLs in urlGroups', async () => {
    render(<TestComponent urlGroups={mockUrlGroups} />)

    // Wait for any effects to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const container = document.getElementById('global-iframe-container')
    expect(container).toBeTruthy()

    // Check if iframes are created
    const iframes = container?.querySelectorAll('iframe')
    expect(iframes?.length).toBe(1)

    // Verify iframe attributes
    iframes?.forEach((iframe) => {
      expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin allow-scripts allow-forms allow-popups')
      expect(iframe.style.width).toBe('100%')
      expect(iframe.style.height).toBe('100%')
    })
  })

  it('uses mobile URL when available and viewport is mobile', async () => {
    // Mock mobile viewport
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width:600px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))

    // Mock useMediaQuery to return true for mobile
    vi.mocked(useMediaQuery).mockReturnValue(true)

    render(<TestComponent urlGroups={mockUrlGroups} />)

    // Wait for any effects to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const container = document.getElementById('global-iframe-container')
    const firstIframe = container?.querySelector('iframe[data-iframe-id="url1"]') as HTMLIFrameElement | null

    expect(firstIframe?.src).toBe('https://m.example.com/1')
  })

  it('handles iframe load events', async () => {
    const onLoad = vi.fn()

    render(
      <IframeProvider activeUrlId="url1">
        <IframeContainer urlGroups={mockUrlGroups} onLoad={onLoad} />
      </IframeProvider>
    )

    // Wait for any effects to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // Wait for the load event to be triggered
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(onLoad).toHaveBeenCalledWith('url1')
  })

  it('updates iframe visibility based on active URL', async () => {
    render(<TestComponent urlGroups={mockUrlGroups} />)

    // Wait for any effects to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const container = document.getElementById('global-iframe-container')
    const wrappers = container?.querySelectorAll('[data-iframe-container]')

    wrappers?.forEach((wrapper) => {
      const urlId = wrapper.getAttribute('data-iframe-container')
      const style = window.getComputedStyle(wrapper)
      // Initially all iframes should be hidden except the active one
      expect(style.visibility).toBe(urlId === 'url1' ? 'visible' : 'hidden')
    })
  })
})
