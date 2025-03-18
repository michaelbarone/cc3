"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Box, CircularProgress, Alert, useTheme, useMediaQuery } from "@mui/material";
import { Url } from "@/app/lib/types";
import { useIframeContext } from "./state/IframeContext";

// Types for iframe states
interface IframeState {
  id: string;
  url: string;
  loading: boolean;
  error: string | null;
  isUnloaded: boolean;
  lastActivityTime: number;
  idleTimeoutMinutes: number;
}

interface IframeContainerProps {
  activeUrlId: string | null;
  activeUrl: Url | null;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
  urlGroups?: Array<{
    id: string;
    name: string;
    urls: Url[];
  }>;
}

// Define a ref type that exposes the iframe control methods
export interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

// Create a singleton container for iframes outside of React
let globalIframeContainer: HTMLDivElement | null = null;

// Function to reset the global container
export function resetGlobalContainer() {
  globalIframeContainer = null;
}

// Function to get or create the global iframe container
function getGlobalIframeContainer() {
  if (!globalIframeContainer) {
    globalIframeContainer = document.createElement("div");
    globalIframeContainer.id = "global-iframe-container";
    globalIframeContainer.style.position = "fixed";
    globalIframeContainer.style.top = "0";
    globalIframeContainer.style.left = "0";
    globalIframeContainer.style.width = "100%";
    globalIframeContainer.style.height = "100%";
    globalIframeContainer.style.pointerEvents = "none";
    globalIframeContainer.style.zIndex = "1000";
    document.body.appendChild(globalIframeContainer);
  }
  return globalIframeContainer;
}

const OriginalIframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function OriginalIframeContainer(
    { activeUrlId, activeUrl, onLoad, onError, onUnload, urlGroups = [] },
    ref,
  ) {
    const [iframeStates, setIframeStates] = useState<Record<string, IframeState>>({});
    const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
    const previousActiveUrlIdRef = useRef<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const eventListeners = useRef<Record<string, { load: () => void; error: () => void }>>({});
    const isInitialMount = useRef(true);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Track all available URLs
    const [allUrlsMap, setAllUrlsMap] = useState<Record<string, string>>({});

    // Reference for idle timeout checking interval
    const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize state from localStorage on mount
    useEffect(() => {
      if (!isInitialMount.current) return;
      isInitialMount.current = false;

      // Initialize all URLs in inactive-unloaded state
      const initialStates: Record<string, IframeState> = {};
      Object.entries(allUrlsMap).forEach(([urlId, url]) => {
        const isActive = urlId === activeUrlId;
        initialStates[urlId] = {
          id: urlId,
          url: url,
          loading: isActive, // Set loading to true for active URL
          error: null,
          isUnloaded: true,
          lastActivityTime: Date.now(),
          idleTimeoutMinutes: 10,
        };

        // If this is the active URL, load its content
        if (isActive) {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            updateIframeSrc(urlId, url);
          }
        }
      });

      // Set initial states
      setIframeStates(initialStates);
    }, [allUrlsMap, activeUrlId]);

    // Sync iframeStates with localStorage
    useEffect(() => {
      const loadedIds = Object.keys(iframeStates).filter(
        (id) =>
          !iframeStates[id].isUnloaded && !iframeStates[id].loading && !iframeStates[id].error,
      );
      localStorage.setItem("iframe-state-loaded-url-ids", JSON.stringify(loadedIds));
    }, [iframeStates]);

    // Initialize the global container and move iframes there
    useEffect(() => {
      const globalContainer = getGlobalIframeContainer();

      // Create all iframes in the global container
      Object.entries(allUrlsMap).forEach(([urlId, url]) => {
        if (!document.querySelector(`[data-iframe-id="${urlId}"]`)) {
          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-iframe-container", urlId);
          wrapper.style.position = "absolute";
          wrapper.style.top = "0";
          wrapper.style.left = "0";
          wrapper.style.width = "100%";
          wrapper.style.height = "100%";
          wrapper.style.overflow = "hidden";
          wrapper.style.pointerEvents = "auto";
          wrapper.style.display = urlId === activeUrlId ? "block" : "none";
          wrapper.style.zIndex = urlId === activeUrlId ? "1" : "0";

          const iframe = document.createElement("iframe");
          iframe.setAttribute("data-iframe-id", urlId);
          iframe.setAttribute("data-url", url);
          iframe.title = `iframe-${urlId}`;
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.style.background = "#fff";
          iframe.style.overflow = "hidden";
          iframe.setAttribute(
            "sandbox",
            "allow-same-origin allow-scripts allow-forms allow-popups",
          );
          iframe.setAttribute(
            "allow",
            "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
          );

          const loadListener = () => {
            if (iframe.src && iframe.src !== "about:blank" && iframe.src !== "") {
              handleIframeLoad(urlId);
            }
          };
          const errorListener = () => handleIframeError(urlId);

          eventListeners.current[urlId] = {
            load: loadListener,
            error: errorListener,
          };

          iframe.addEventListener("load", loadListener);
          iframe.addEventListener("error", errorListener);

          // Store ref to the iframe
          iframeRefs.current[urlId] = iframe;

          // Initialize in inactive-unloaded state
          iframe.src = "";
          setIframeStates((prev) => ({
            ...prev,
            [urlId]: {
              id: urlId,
              url: url,
              loading: urlId === activeUrlId, // Set loading state for active URL
              error: null,
              isUnloaded: true,
              lastActivityTime: Date.now(),
              idleTimeoutMinutes: 10,
            },
          }));

          wrapper.appendChild(iframe);
          globalContainer.appendChild(wrapper);

          // If this is the active URL, load its content after a short delay
          if (urlId === activeUrlId) {
            setTimeout(() => {
              updateIframeSrc(urlId, url);
            }, 100);
          }
        }
      });

      // Update container position when our local container moves
      const observer = new ResizeObserver(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          Object.values(iframeRefs.current).forEach((iframe) => {
            if (iframe?.parentElement) {
              iframe.parentElement.style.position = "fixed";
              iframe.parentElement.style.top = `${rect.top}px`;
              iframe.parentElement.style.left = `${rect.left}px`;
              iframe.parentElement.style.width = `${rect.width}px`;
              iframe.parentElement.style.height = `${rect.height}px`;
            }
          });
        }
      });

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
        // Don't remove iframes on unmount, they should persist
        Object.entries(eventListeners.current).forEach(([urlId, listeners]) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            iframe.removeEventListener("load", listeners.load);
            iframe.removeEventListener("error", listeners.error);
          }
        });
      };
    }, [allUrlsMap, activeUrlId]);

    // Update iframe visibility when active URL changes
    useEffect(() => {
      if (!activeUrlId || Object.keys(allUrlsMap).length === 0) {
        return;
      }

      // Update visibility for all iframes
      Object.keys(allUrlsMap).forEach((urlId) => {
        const isActive = urlId === activeUrlId;
        updateIframeVisibility(urlId, isActive);

        // If this is the active URL and it's unloaded, load it
        if (isActive && iframeStates[urlId]?.isUnloaded) {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            const targetUrl = allUrlsMap[urlId];
            updateIframeSrc(urlId, targetUrl);
          }
        }
      });

      // Update previous URL reference
      previousActiveUrlIdRef.current = activeUrlId;
    }, [activeUrlId, allUrlsMap, iframeStates]);

    // Collect URLs from groups
    useEffect(() => {
      const urls: Record<string, string> = {};
      urlGroups.forEach((group) => {
        group.urls.forEach((url) => {
          urls[url.id] = url.url;
        });
      });
      setAllUrlsMap(urls);
    }, [urlGroups]);

    // Set up idle check interval
    useEffect(() => {
      // Start the interval if it's not already running
      if (!idleCheckIntervalRef.current) {
        idleCheckIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const activeIframes = Object.entries(iframeStates).filter(
            ([, state]) => !state.loading && !state.error && !state.isUnloaded,
          );

          // Check each loaded iframe for idle timeout
          activeIframes.forEach(([urlId, state]) => {
            // Skip the currently active iframe
            if (urlId === activeUrlId) return;

            // Skip iframes with idle timeout disabled (0 minutes)
            if (state.idleTimeoutMinutes === 0) return;

            const idleTimeMs = state.idleTimeoutMinutes * 60 * 1000;
            const timeSinceLastActivity = now - state.lastActivityTime;

            // Unload iframe if it's been idle too long
            if (timeSinceLastActivity > idleTimeMs) {
              console.log(
                `Unloading iframe ${urlId} due to ${state.idleTimeoutMinutes} minutes of inactivity`,
              );
              unloadIframe(urlId);
            }
          });
        }, 30000); // Check every 30 seconds
      }

      // Clean up interval on unmount
      return () => {
        if (idleCheckIntervalRef.current) {
          clearInterval(idleCheckIntervalRef.current);
          idleCheckIntervalRef.current = null;
        }
      };
    }, [iframeStates, activeUrlId]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      resetIframe: (urlId: string) => {
        resetIframe(urlId);
      },
      unloadIframe: (urlId: string) => {
        unloadIframe(urlId);
      },
      reloadUnloadedIframe: (urlId: string) => {
        reloadUnloadedIframe(urlId);
      },
      getLoadedUrlIds: () => {
        // Get loaded URLs based on iframe state
        const loadedIds = Object.entries(iframeStates)
          .filter(([urlId, state]) => {
            const iframe = iframeRefs.current[urlId];
            if (!iframe) return false;

            // An iframe is considered loaded if:
            // 1. It has a valid src attribute that matches its data-url
            // 2. It's not in a loading state
            // 3. It has no errors
            // 4. It's not explicitly unloaded
            const currentSrc = iframe.src;
            const targetUrl = iframe.getAttribute("data-url");

            const hasValidSrc =
              currentSrc &&
              currentSrc !== "about:blank" &&
              currentSrc !== "" &&
              currentSrc === targetUrl;

            const isLoaded = !state.loading && !state.error && !state.isUnloaded && hasValidSrc;

            return isLoaded;
          })
          .map(([urlId]) => urlId);

        // Update localStorage to ensure persistence
        localStorage.setItem("iframe-state-loaded-url-ids", JSON.stringify(loadedIds));

        return loadedIds;
      },
    }));

    // Function to toggle iframe visibility based on active URL
    const updateIframeVisibility = (urlId: string, isActive: boolean) => {
      const container = document.querySelector(`[data-iframe-container="${urlId}"]`);
      if (container) {
        const prevDisplay = (container as HTMLElement).style.display;
        const newDisplay = isActive ? "block" : "none";

        if (prevDisplay !== newDisplay) {
          (container as HTMLElement).style.display = newDisplay;
          // Update z-index to ensure active iframe is on top
          (container as HTMLElement).style.zIndex = isActive ? "1" : "0";
        }
      }
    };

    // Function to update iframe src attributes directly - NEVER CLEAR SRC when switching
    const updateIframeSrc = (urlId: string, src: string | null) => {
      const iframe = iframeRefs.current[urlId];
      if (!iframe) return;

      const prevSrc = iframe.src;
      const isActive = urlId === activeUrlId;

      // Store the URL we're trying to load as the data-url attribute
      if (src && src !== "about:blank") {
        iframe.setAttribute("data-url", src);
      }

      if (src === null || src === "") {
        // Explicit unload operation
        if (iframe.src && iframe.src !== "about:blank" && iframe.src !== "") {
          iframe.setAttribute("data-src", iframe.src);
        }
        iframe.src = "";

        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            ...(prev[urlId] || {
              id: urlId,
              url: iframe.getAttribute("data-src") || "",
              idleTimeoutMinutes: 10,
            }),
            loading: false,
            error: null,
            isUnloaded: true,
            lastActivityTime: Date.now(),
          },
        }));

        // Notify parent of unload
        if (onUnload) onUnload(urlId);
      } else if (src !== prevSrc) {
        // Loading new content
        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            ...(prev[urlId] || {
              id: urlId,
              url: src,
              idleTimeoutMinutes: 10,
            }),
            loading: true,
            error: null,
            isUnloaded: true,
            lastActivityTime: Date.now(),
          },
        }));

        // Set the src to load content
        iframe.src = src;
      }

      // Update visibility based on active state
      updateIframeVisibility(urlId, isActive);
    };

    // Handle iframe creation and management entirely through DOM
    useEffect(() => {
      // Only run once when the URL map is populated
      if (Object.keys(allUrlsMap).length === 0 || !containerRef.current) {
        return;
      }

      console.log("Creating iframe DOM elements imperatively (once only)");
      const container = containerRef.current;

      // Create all iframe elements
      Object.entries(allUrlsMap).forEach(([urlId, url]) => {
        // Check if iframe already exists to avoid duplicates
        if (document.querySelector(`[data-iframe-id="${urlId}"]`)) {
          return;
        }

        // Create iframe wrapper
        const wrapperDiv = document.createElement("div");
        wrapperDiv.setAttribute("data-iframe-container", urlId);
        wrapperDiv.style.position = "absolute";
        wrapperDiv.style.top = "0";
        wrapperDiv.style.left = "0";
        wrapperDiv.style.width = "100%";
        wrapperDiv.style.height = "100%";
        wrapperDiv.style.overflow = "hidden";
        wrapperDiv.style.display = urlId === activeUrlId ? "block" : "none";
        wrapperDiv.style.zIndex = urlId === activeUrlId ? "1" : "0";

        // Create iframe element
        const iframe = document.createElement("iframe");
        iframe.setAttribute("data-iframe-id", urlId);
        iframe.setAttribute("data-url", url);
        iframe.title = `iframe-${urlId}`;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.background = "#fff";
        iframe.style.overflow = "hidden";
        iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-popups");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
        );

        // Create stable event listener references
        const loadListener = () => {
          // Only trigger load event for non-empty src
          if (iframe.src && iframe.src !== "about:blank" && iframe.src !== "") {
            handleIframeLoad(urlId);
          }
        };
        const errorListener = () => handleIframeError(urlId);

        // Store listeners for cleanup
        eventListeners.current[urlId] = {
          load: loadListener,
          error: errorListener,
        };

        // Add event listeners
        iframe.addEventListener("load", loadListener);
        iframe.addEventListener("error", errorListener);

        // Store ref to the iframe
        iframeRefs.current[urlId] = iframe;

        // Initialize in inactive-unloaded state
        iframe.src = "";
        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            id: urlId,
            url: url,
            loading: false,
            error: null,
            isUnloaded: true,
            lastActivityTime: Date.now(),
            idleTimeoutMinutes: 10,
          },
        }));

        // Add iframe to wrapper and wrapper to container
        wrapperDiv.appendChild(iframe);
        container.appendChild(wrapperDiv);
      });

      // Initial visibility update
      if (activeUrlId) {
        updateIframeVisibility(activeUrlId, true);
      }

      // Cleanup function to remove event listeners
      return () => {
        Object.entries(eventListeners.current).forEach(([urlId, listeners]) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            iframe.removeEventListener("load", listeners.load);
            iframe.removeEventListener("error", listeners.error);
          }
        });
        eventListeners.current = {};
      };
    }, [allUrlsMap]);

    // Handle iframe load event
    const handleIframeLoad = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (!iframe) return;

      // Only process load event if the iframe has valid content
      if (!iframe.src || iframe.src === "about:blank" || iframe.src === "") {
        return;
      }

      const isActive = urlId === activeUrlId;
      const currentSrc = iframe.src;
      const targetUrl = iframe.getAttribute("data-url");

      // Verify the loaded URL matches what we expected
      if (currentSrc === targetUrl) {
        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            ...(prev[urlId] || {
              id: urlId,
              url: currentSrc,
              idleTimeoutMinutes: 10,
            }),
            loading: false,
            error: null,
            isUnloaded: false,
            lastActivityTime: Date.now(),
          },
        }));

        // Update visibility and notify parent
        updateIframeVisibility(urlId, isActive);
        if (onLoad) onLoad(urlId);

        // Try to adjust iframe size
        try {
          adjustIframeSize(iframe);
        } catch (error) {
          console.warn("Failed to adjust iframe size:", error);
        }
      } else {
        // If loaded URL doesn't match expected URL, treat as error
        handleIframeError(urlId);
      }
    };

    // Helper function to adjust iframe size
    const adjustIframeSize = (iframe: HTMLIFrameElement) => {
      try {
        // Only try to adjust if same origin, otherwise it will throw security errors
        if (iframe.contentWindow && iframe.contentDocument) {
          const docHeight = iframe.contentDocument.body.scrollHeight;
          const docWidth = iframe.contentDocument.body.scrollWidth;

          // Set iframe size to content size
          if (docHeight > 0 && docWidth > 0) {
            iframe.style.height = `${docHeight}px`;
            iframe.style.width = `${docWidth}px`;
          }

          // Ensure no scrollbars appear in the iframe content
          if (iframe.contentDocument.body) {
            iframe.contentDocument.body.style.overflow = "hidden";
          }
        }
      } catch {
        // Silently fail if cross-origin
        console.warn("Cross-origin iframe resize not allowed");
      }
    };

    // Handle iframe error event
    const handleIframeError = (urlId: string) => {
      const errorMessage = "Failed to load the page";

      setIframeStates((prev) => ({
        ...prev,
        [urlId]: {
          ...(prev[urlId] || {
            id: urlId,
            url: allUrlsMap[urlId] || "",
            idleTimeoutMinutes: 10,
          }),
          loading: false,
          error: errorMessage,
          isUnloaded: false,
        },
      }));

      if (onError) onError(urlId, errorMessage);
    };

    // Reset iframe - reload the current URL
    const resetIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        const url = iframe.getAttribute("data-url") || iframe.src || allUrlsMap[urlId];
        if (!url) return;

        // Use our imperative update function
        updateIframeSrc(urlId, "about:blank");

        // Force a reflow
        setTimeout(() => {
          updateIframeSrc(urlId, url);
        }, 100);

        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            ...(prev[urlId] || {
              id: urlId,
              url,
              idleTimeoutMinutes: 10,
            }),
            loading: true,
            error: null,
            isUnloaded: false,
          },
        }));
      }
    };

    // Unload iframe - keep in DOM but clear the source
    // ONLY called for explicit unload operations (like idle timeout)
    const unloadIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        // Use our imperative update function to clear src - pass null to indicate explicit unload
        updateIframeSrc(urlId, null); // null means explicitly unload it

        setIframeStates((prev) => ({
          ...prev,
          [urlId]: {
            ...(prev[urlId] || {
              id: urlId,
              url: iframe.getAttribute("data-url") || allUrlsMap[urlId] || "",
              idleTimeoutMinutes: 10,
            }),
            loading: false,
            error: null,
            isUnloaded: true,
          },
        }));

        if (onUnload) onUnload(urlId);
      }
    };

    // Explicit reload function for unloaded iframes or load new iframes
    const reloadUnloadedIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (!iframe) return;

      // Only reload if this is the active URL
      if (urlId !== activeUrlId) {
        console.log(`Not reloading iframe ${urlId} because it's not active`);
        return;
      }

      // Get URL from data attribute, state, or allUrls
      const url =
        iframe.getAttribute("data-url") ||
        iframeStates[urlId]?.url ||
        allUrlsMap[urlId] ||
        (activeUrl?.id === urlId ? activeUrl.url : null);

      // If we can't determine the URL, we can't reload
      if (!url) {
        console.warn(`Cannot reload iframe ${urlId}: URL not found`);
        return;
      }

      // Update state first
      setIframeStates((prev) => ({
        ...prev,
        [urlId]: {
          ...(prev[urlId] || {
            id: urlId,
            url,
            idleTimeoutMinutes: 10,
          }),
          loading: true,
          error: null,
          isUnloaded: false,
          lastActivityTime: Date.now(), // Reset activity time on reload
        },
      }));

      // Then load the URL using our imperative update function
      setTimeout(() => {
        updateIframeSrc(urlId, url);
      }, 50);
    };

    // Get the appropriate URL based on device type
    const getUrlForDevice = (url: Url | null) => {
      if (!url) return "";
      return isMobile && url.urlMobile ? url.urlMobile : url.url;
    };

    if (!activeUrl || !activeUrlId) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            bgcolor: "background.paper",
          }}
        >
          <Alert severity="info">Select a URL from the menu to display content</Alert>
        </Box>
      );
    }

    const currentIframeState = iframeStates[activeUrlId];

    return (
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        {/* Loading indicator */}
        {currentIframeState?.loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.1)",
              zIndex: 2000,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Error message */}
        {currentIframeState?.error && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: 2,
              zIndex: 2000,
            }}
          >
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Box
                  component="button"
                  onClick={() => resetIframe(activeUrlId)}
                  sx={{
                    border: "none",
                    bgcolor: "transparent",
                    color: "primary.main",
                    cursor: "pointer",
                    fontWeight: "bold",
                    padding: "4px 8px",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Retry
                </Box>
              }
            >
              {currentIframeState.error}
            </Alert>
          </Box>
        )}

        {/* Unloaded message */}
        {currentIframeState?.isUnloaded && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              zIndex: 2000,
            }}
          >
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Box
                  component="button"
                  onClick={() => reloadUnloadedIframe(activeUrlId)}
                  sx={{
                    border: "none",
                    bgcolor: "transparent",
                    color: "primary.main",
                    cursor: "pointer",
                    fontWeight: "bold",
                    padding: "4px 8px",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Reload
                </Box>
              }
            >
              Content has been unloaded to save resources. Click to reload.
            </Alert>
          </Box>
        )}

        {activeUrl && (
          <iframe
            key={activeUrlId}
            src={getUrlForDevice(activeUrl)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            onLoad={() => activeUrlId && onLoad?.(activeUrlId)}
            onError={() => activeUrlId && onError?.(activeUrlId, "Failed to load URL")}
          />
        )}
      </Box>
    );
  },
);

// Create a new wrapper that uses context and adapts to the old component
const ContextAwareIframeContainer = forwardRef<IframeContainerRef, Partial<IframeContainerProps>>(
  function ContextAwareIframeContainer(props, ref) {
    const { activeUrlId, states } = useIframeContext();

    // Find active URL object from context state
    const activeUrl = activeUrlId
      ? {
          id: activeUrlId,
          url: states[activeUrlId]?.url || "",
          title: `URL ${activeUrlId}`,
          // Add any other required Url properties with defaults
          iconPath: "",
          displayOrder: 0,
          urlGroupId: "",
        }
      : null;

    // For now, adapt the context to the old props format
    // Later we can refactor the entire component
    return (
      <OriginalIframeContainer
        ref={ref}
        activeUrlId={activeUrlId}
        activeUrl={activeUrl as Url}
        {...props}
      />
    );
  },
);

// Export the context-aware component as default
export default ContextAwareIframeContainer;
