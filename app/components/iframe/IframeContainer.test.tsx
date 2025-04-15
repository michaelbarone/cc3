import IframeContainer, { resetGlobalContainer } from "@/app/components/iframe/IframeContainer";
import { IframeProvider, useIframeState } from "@/app/lib/state/iframe-state";
import type { IframeContainerRef, UrlGroup } from "@/app/types/iframe";
import { server } from "@/test/mocks/server";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Constants for test configuration
const TEST_TIMEOUT = {
  NORMAL: 5000, // Normal operations
  EXTENDED: 10000, // Complex operations
  INTERVAL: 100, // Polling interval
};

// Utility function for retrying operations
const retryOperation = async <T,>(
  operation: () => Promise<T> | T,
  { timeout = TEST_TIMEOUT.NORMAL, interval = TEST_TIMEOUT.INTERVAL } = {},
): Promise<T> => {
  const startTime = Date.now();
  let lastError;

  while (Date.now() - startTime < timeout) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw lastError;
};

// Mock useMediaQuery
const mockUseMediaQuery = vi.fn().mockReturnValue(false);

// Mock Material UI components and hooks
vi.mock("@mui/material", () => ({
  __esModule: true,
  useMediaQuery: () => mockUseMediaQuery(),
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  IconButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Mock Material UI icons
vi.mock("@mui/icons-material", () => ({
  __esModule: true,
  Refresh: () => <span>refresh</span>,
  Close: () => <span>close</span>,
}));

// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

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
}));

// Setup mocks before tests
beforeAll(() => {
  window.ResizeObserver = mockResizeObserver;
  window.matchMedia = mockMatchMedia;
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  resetGlobalContainer();
  vi.useRealTimers();
});

// Component with event handlers
function TestComponentWithHandlers({
  urlGroups,
  onLoad,
  onError,
}: {
  urlGroups: UrlGroup[];
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
}) {
  const iframeRef = useRef<IframeContainerRef>(null);
  const { dispatch } = useIframeState();

  useEffect(() => {
    dispatch({
      type: "INIT_URLS",
      payload: {
        urlGroups,
        initialUrlId: "url1",
      },
    });
  }, [dispatch, urlGroups]);

  return (
    <IframeContainer ref={iframeRef} urlGroups={urlGroups} onLoad={onLoad} onError={onError} />
  );
}

// Wrapper with provider
function TestWrapper({ children, urlGroups }: { children: ReactNode; urlGroups: UrlGroup[] }) {
  return <IframeProvider>{children}</IframeProvider>;
}

describe("IframeContainer", () => {
  const mockUrlGroups: UrlGroup[] = [
    {
      id: "group1",
      name: "Group 1",
      urls: [
        {
          id: "url1",
          url: "https://example.com/1",
          urlMobile: "https://m.example.com/1",
        },
      ],
    },
  ];

  beforeEach(() => {
    // Mock iframe behavior
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "iframe") {
        // Store the src value
        let srcValue = "";

        // Override src property
        Object.defineProperty(element, "src", {
          get: () => srcValue,
          set: (value) => {
            srcValue = value;
            // Simulate successful load after a short delay
            setTimeout(() => {
              element.dispatchEvent(new Event("load"));
            }, 0);
          },
          configurable: true,
        });
      }
      return element;
    });

    // Add MSW handlers for iframe URLs
    server.use(
      http.get("https://example.com/*", () => {
        return new HttpResponse("<html><body>Mock iframe content</body></html>", {
          headers: {
            "Content-Type": "text/html",
          },
        });
      }),
      http.get("https://m.example.com/*", () => {
        return new HttpResponse("<html><body>Mock mobile iframe content</body></html>", {
          headers: {
            "Content-Type": "text/html",
          },
        });
      }),
    );
  });

  it("should create iframes for all URLs in urlGroups", async () => {
    render(
      <TestWrapper urlGroups={mockUrlGroups}>
        <TestComponentWithHandlers urlGroups={mockUrlGroups} />
      </TestWrapper>,
    );

    await retryOperation(async () => {
      const container = document.getElementById("global-iframe-container");
      if (!container) throw new Error("Global container not found");

      const iframes = container.querySelectorAll("iframe");
      if (!iframes?.length) throw new Error("No iframes found");

      expect(iframes.length).toBe(1);
    });
  });

  it("should handle iframe load events", async () => {
    const onLoad = vi.fn();

    render(
      <TestWrapper urlGroups={mockUrlGroups}>
        <TestComponentWithHandlers urlGroups={mockUrlGroups} onLoad={onLoad} />
      </TestWrapper>,
    );

    await retryOperation(async () => {
      const iframes = document.querySelectorAll("iframe");
      if (!iframes?.length) throw new Error("No iframes found");

      iframes.forEach((iframe) => {
        fireEvent.load(iframe);
      });
      expect(onLoad).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle iframe errors", async () => {
    const onError = vi.fn();

    render(
      <TestWrapper urlGroups={mockUrlGroups}>
        <TestComponentWithHandlers urlGroups={mockUrlGroups} onError={onError} />
      </TestWrapper>,
    );

    await retryOperation(async () => {
      const iframes = document.querySelectorAll("iframe");
      if (!iframes?.length) throw new Error("No iframes found");

      iframes.forEach((iframe) => {
        fireEvent.error(iframe);
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  it("should expose control methods via ref", async () => {
    const TestComponent = () => {
      const ref = useRef<IframeContainerRef>(null);

      return (
        <IframeProvider>
          <IframeContainer ref={ref} urlGroups={mockUrlGroups} />
          <button onClick={() => ref.current?.resetIframe("url1")}>Reset</button>
          <button onClick={() => ref.current?.unloadIframe("url1")}>Unload</button>
          <button onClick={() => ref.current?.reloadUnloadedIframe("url1")}>Reload</button>
        </IframeProvider>
      );
    };

    render(<TestComponent />);

    await retryOperation(async () => {
      const buttons = screen.getAllByRole("button");
      if (buttons.length !== 3) throw new Error(`Expected 3 buttons, found ${buttons.length}`);
      expect(buttons).toHaveLength(3);
    });
  });

  it("should handle mobile URLs when on mobile viewport", async () => {
    // Set useMediaQuery to return true for mobile viewport
    mockUseMediaQuery.mockReturnValue(true);

    render(<TestComponentWithHandlers urlGroups={mockUrlGroups} />);

    await retryOperation(async () => {
      const iframe = document.querySelector("iframe");
      if (!iframe) throw new Error("Iframe not found");

      const dataSrc = iframe.getAttribute("data-src");
      if (dataSrc !== "https://m.example.com/1") {
        throw new Error(`Expected mobile URL, got ${dataSrc}`);
      }
      expect(dataSrc).toBe("https://m.example.com/1");
    });

    // Reset mock
    mockUseMediaQuery.mockReturnValue(false);
  });

  it("should update iframe visibility based on active URL", async () => {
    // Reset global container before test
    resetGlobalContainer();
    vi.useFakeTimers();

    const mockUrlGroups: UrlGroup[] = [
      {
        id: "group1",
        name: "Group 1",
        urls: [
          { id: "url1", url: "https://example.com/1" },
          { id: "url2", url: "https://example.com/2" },
        ],
      },
    ];

    // Initialize with url1 active and loaded
    const { rerender } = render(
      <IframeProvider>
        <IframeContainer urlGroups={mockUrlGroups} />
      </IframeProvider>,
    );

    // Wait for initial render with retry logic
    await retryOperation(async () => {
      const globalContainer = document.getElementById("global-iframe-container");
      if (!globalContainer) throw new Error("Global container not found");

      const container1 = globalContainer.querySelector(
        '[data-iframe-container="url1"]',
      ) as HTMLDivElement;
      const container2 = globalContainer.querySelector(
        '[data-iframe-container="url2"]',
      ) as HTMLDivElement;

      if (!container1 || !container2) throw new Error("Containers not found");

      expect(container1.style.visibility).toBe("visible");
      expect(container1.style.display).toBe("block");
      expect(container2.style.visibility).toBe("hidden");
      expect(container2.style.display).toBe("none");
    });

    // Change active URL to url2
    rerender(
      <IframeProvider>
        <IframeContainer urlGroups={mockUrlGroups} />
      </IframeProvider>,
    );

    // Wait for visibility update with retry logic
    await retryOperation(async () => {
      const globalContainer = document.getElementById("global-iframe-container");
      if (!globalContainer) throw new Error("Global container not found");

      const container1 = globalContainer.querySelector(
        '[data-iframe-container="url1"]',
      ) as HTMLDivElement;
      const container2 = globalContainer.querySelector(
        '[data-iframe-container="url2"]',
      ) as HTMLDivElement;

      if (!container1 || !container2) throw new Error("Containers not found");

      expect(container1.style.visibility).toBe("hidden");
      expect(container1.style.display).toBe("none");
      expect(container2.style.visibility).toBe("visible");
      expect(container2.style.display).toBe("block");
    });

    // Restore real timers
    vi.useRealTimers();
  });

  it("should cleanup iframes on unmount", async () => {
    // Use fake timers for predictable cleanup timing
    vi.useFakeTimers();

    // Render component
    const { unmount } = render(<TestComponentWithHandlers urlGroups={mockUrlGroups} />);

    // Wait for container to be created
    await retryOperation(async () => {
      const container = document.getElementById("global-iframe-container");
      if (!container) throw new Error("Container not found");
      expect(container).not.toBeNull();
    });

    // Unmount component
    unmount();

    // Advance timers to trigger cleanup
    await act(async () => {
      vi.advanceTimersByTime(TEST_TIMEOUT.INTERVAL);
    });

    // Wait for cleanup with retry logic
    await retryOperation(async () => {
      // Check that all iframes are removed
      const iframes = document.querySelectorAll("iframe");
      expect(iframes.length).toBe(0);

      // Check that the container is removed
      const container = document.getElementById("global-iframe-container");
      expect(container).toBeNull();
    });

    // Restore real timers
    vi.useRealTimers();
  });

  it("should reset iframe when requested", async () => {
    const ref = useRef<IframeContainerRef>(null);

    render(
      <TestWrapper urlGroups={mockUrlGroups}>
        <>
          <TestComponentWithHandlers urlGroups={mockUrlGroups} />
          <button onClick={() => ref.current?.resetIframe("url1")}>Reset</button>
        </>
      </TestWrapper>,
    );

    // ... existing code ...
  });

  it("should handle URL changes", async () => {
    const mockUrlGroupsWithTwoUrls: UrlGroup[] = [
      {
        id: "group1",
        name: "Group 1",
        urls: [
          {
            id: "url1",
            url: "https://example.com/1",
          },
          {
            id: "url2",
            url: "https://example.com/2",
          },
        ],
      },
    ];

    // Initialize with url1 active and loaded
    const { rerender } = render(
      <TestWrapper urlGroups={mockUrlGroupsWithTwoUrls}>
        <TestComponentWithHandlers urlGroups={mockUrlGroupsWithTwoUrls} />
      </TestWrapper>,
    );

    // ... existing code ...

    // Change active URL to url2
    rerender(
      <TestWrapper urlGroups={mockUrlGroupsWithTwoUrls}>
        <TestComponentWithHandlers urlGroups={mockUrlGroupsWithTwoUrls} />
      </TestWrapper>,
    );

    // ... existing code ...
  });
});
