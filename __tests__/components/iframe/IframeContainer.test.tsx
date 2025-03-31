import IframeContainer, { IframeContainerRef, resetGlobalContainer } from '@/app/components/iframe/IframeContainer'
import { IframeProvider } from '@/app/components/iframe/state/IframeContext'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../mocks/server'

// Mock useMediaQuery
const mockUseMediaQuery = vi.fn().mockReturnValue(false)

// Mock Material UI components and hooks
vi.mock('@mui/material', () => ({
  __esModule: true,
  useMediaQuery: () => mockUseMediaQuery(),
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IconButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

// Mock Material UI icons
vi.mock('@mui/icons-material', () => ({
  __esModule: true,
  Refresh: () => <span>refresh</span>,
  Close: () => <span>close</span>,
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
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })
  })

  it('should handle mobile URLs when on mobile viewport', async () => {
    // Set useMediaQuery to return true for mobile viewport
    mockUseMediaQuery.mockReturnValue(true)

    render(<TestComponent urlGroups={mockUrlGroups} />)

    await waitFor(() => {
      const iframe = document.querySelector('iframe')
      expect(iframe?.getAttribute('data-src')).toBe('https://m.example.com/1')
    })

    // Reset mock
    mockUseMediaQuery.mockReturnValue(false)
  })

  it('should update iframe visibility based on active URL', async () => {
    const mockUrlGroups: UrlGroups = [
      {
        id: 'group1',
        urls: [
          { id: 'url1', url: 'https://example.com/1' },
          { id: 'url2', url: 'https://example.com/2' }
        ]
      }
    ];

    // Reset global container before test
    resetGlobalContainer();

    // Initialize with url1 active and loaded
    const { rerender } = render(
      <IframeProvider activeUrlId="url1">
        <IframeContainer urlGroups={mockUrlGroups} />
      </IframeProvider>
    );

    // Wait for initial render and ensure url1 is loaded
    await waitFor(() => {
      const globalContainer = document.getElementById('global-iframe-container');
      expect(globalContainer).not.toBeNull();

      const container1 = globalContainer?.querySelector('[data-iframe-container="url1"]') as HTMLDivElement;
      const container2 = globalContainer?.querySelector('[data-iframe-container="url2"]') as HTMLDivElement;
      expect(container1).not.toBeNull();
      expect(container2).not.toBeNull();
      expect(container1.style.visibility).toBe('visible');
      expect(container1.style.display).toBe('block');
      expect(container2.style.visibility).toBe('hidden');
      expect(container2.style.display).toBe('none');
    }, { timeout: 2000 });

    // Change active URL to url2
    rerender(
      <IframeProvider activeUrlId="url2">
        <IframeContainer urlGroups={mockUrlGroups} />
      </IframeProvider>
    );

    // Add a small delay to allow for state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for update with increased timeout
    await waitFor(() => {
      const globalContainer = document.getElementById('global-iframe-container');
      expect(globalContainer).not.toBeNull();

      const container1 = globalContainer?.querySelector('[data-iframe-container="url1"]') as HTMLDivElement;
      const container2 = globalContainer?.querySelector('[data-iframe-container="url2"]') as HTMLDivElement;
      expect(container1).not.toBeNull();
      expect(container2).not.toBeNull();
      expect(container1.style.visibility).toBe('hidden');
      expect(container1.style.display).toBe('none');
      expect(container2.style.visibility).toBe('visible');
      expect(container2.style.display).toBe('block');
    }, { timeout: 2000 });
  })

  it('should cleanup iframes on unmount', async () => {
    // Render component
    const { unmount } = render(<TestComponent urlGroups={mockUrlGroups} />)

    // Wait for container to be created
    await waitFor(() => {
      expect(document.getElementById('global-iframe-container')).not.toBeNull()
    })

    // Unmount component
    unmount()

    // Force a re-render to ensure cleanup has completed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Wait for container to be removed
    await waitFor(() => {
      // Check that all iframes are removed
      const iframes = document.querySelectorAll('iframe')
      expect(iframes.length).toBe(0)

      // Check that the container is removed
      const container = document.getElementById('global-iframe-container')
      expect(container).toBeNull()
    }, { timeout: 2000 })
  })
})
