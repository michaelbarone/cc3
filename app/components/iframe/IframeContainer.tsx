"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { useIframeLifecycle, useUrlManager } from "@/app/lib/hooks/useIframe";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import type { IframeContainerProps, IframeContainerRef, IframeUrl } from "@/app/types/iframe";
import { Box, useMediaQuery } from "@mui/material";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminEmptyState } from "./AdminEmptyState";
import { UnloadedContent } from "./UnloadedContent";

// Create a singleton container for iframes outside of React
let globalIframeContainer: HTMLDivElement | null = null;

// Function to reset the global container
export function resetGlobalContainer() {
  if (globalIframeContainer) {
    globalIframeContainer.remove();
  }
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

    // Set initial viewport height CSS variable
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    }

    if (document.body) {
      document.body.appendChild(globalIframeContainer);
    } else {
      console.error("Document body not available");
    }
  }
  return globalIframeContainer;
}

// Add a function to update container position based on menu position
function updateGlobalContainerPosition(menuPosition: "top" | "side") {
  if (!globalIframeContainer) return;

  // Update the viewport height CSS variable
  if (typeof window !== "undefined") {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }

  if (menuPosition === "top") {
    // Use media query to determine the correct AppBar height
    const isMobileView = window.innerWidth < 600;
    const appBarHeight = isMobileView ? "56px" : "64px"; // AppBar height changes at small screens

    globalIframeContainer.style.top = appBarHeight;
    globalIframeContainer.style.bottom = "0";
    globalIframeContainer.style.left = "0";
    globalIframeContainer.style.height = `calc(var(--vh, 1vh) * 100 - ${appBarHeight})`;

    // Add resize listener to adjust for header height changes and viewport changes
    const handleResize = () => {
      if (!globalIframeContainer) return;

      // Update the CSS variable
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

      const isMobileView = window.innerWidth < 600;
      const appBarHeight = isMobileView ? "56px" : "64px";
      globalIframeContainer.style.top = appBarHeight;
      globalIframeContainer.style.height = `calc(var(--vh, 1vh) * 100 - ${appBarHeight})`;

      // Update all iframe wrapper elements
      const wrappers = globalIframeContainer.querySelectorAll("[data-iframe-container]");
      wrappers.forEach((wrapper) => {
        if (wrapper) {
          (wrapper as HTMLElement).style.height = `calc(var(--vh, 1vh) * 100 - ${appBarHeight})`;
        }
      });
    };

    // Remove any existing resize listener
    window.removeEventListener("resize", handleResize);
    // Add new resize listener
    window.addEventListener("resize", handleResize);

    // Add event listeners for mobile keyboard
    window.removeEventListener("focusin", handleResize);
    window.removeEventListener("focusout", handleResize);
    window.addEventListener("focusin", handleResize);
    window.addEventListener("focusout", handleResize);
  } else {
    globalIframeContainer.style.top = "0";
    globalIframeContainer.style.bottom = "0";
    globalIframeContainer.style.right = "0";
    globalIframeContainer.style.left = "240px";
    globalIframeContainer.style.height = "100%";
    globalIframeContainer.style.width = "calc(100% - 240px)";

    // Remove resize listeners if not needed
    const handleResize = () => {};
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("focusin", handleResize);
    window.removeEventListener("focusout", handleResize);
  }
}

// Individual iframe component
function IframeElement({
  urlData,
  isMobile,
  onLoad,
  onError,
  containerRef,
}: {
  urlData: IframeUrl;
  isMobile: boolean;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { handleLoad, handleError } = useIframeLifecycle(urlData.id);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Store URL data in a ref to avoid recreating the iframe on URL data changes
  const urlDataRef = useRef(urlData);

  // Only create the iframe once on mount
  useEffect(() => {
    const container = getGlobalIframeContainer();
    if (!container || !containerRef.current) return;

    // Check if wrapper already exists for this URL ID
    const existingWrapper = container.querySelector(`[data-iframe-container="${urlData.id}"]`);

    // Create wrapper div if it doesn't exist
    if (!existingWrapper && !wrapperRef.current) {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-iframe-container", urlData.id);
      wrapper.style.position = "absolute";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.overflow = "hidden";
      wrapper.style.pointerEvents = "auto";
      wrapper.style.visibility = "hidden";
      wrapper.style.display = "none";
      wrapper.style.zIndex = "0";

      // Create iframe if it doesn't exist
      const iframe = document.createElement("iframe");
      iframe.setAttribute("data-iframe-id", urlData.id);
      // Get the current isMobile value at creation time
      const currentIsMobile = window.matchMedia("(max-width:600px)").matches;
      const effectiveUrl = getEffectiveUrl(urlData, currentIsMobile);
      iframe.setAttribute("data-src", effectiveUrl);
      iframe.title = `iframe-${urlData.id}`;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.background = "#fff";
      iframe.style.overflow = "hidden";
      iframe.setAttribute(
        "sandbox",
        "allow-same-origin allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation allow-top-navigation-by-user-activation",
      );
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
      );
      iframe.setAttribute("referrerPolicy", "no-referrer-when-downgrade");

      // Add event listeners
      const loadHandler = () => {
        if (iframe.src && iframe.src !== "about:blank") {
          handleLoad();
          onLoad?.(urlData.id);
        }
      };

      const errorHandler = () => {
        const errorMsg = "Failed to load content";
        handleError(errorMsg);
        onError?.(urlData.id, errorMsg);
      };

      iframe.addEventListener("load", loadHandler);
      iframe.addEventListener("error", errorHandler);

      // Add to DOM
      wrapper.appendChild(iframe);
      container.appendChild(wrapper);

      // Store refs
      iframeRef.current = iframe;
      wrapperRef.current = wrapper;

      // Set initial src if visible
      if (urlData.isVisible) {
        iframe.src = effectiveUrl;

        // Force update the loaded state after a short delay to ensure the iframe has loaded
        setTimeout(() => {
          if (iframe.src && iframe.src !== "about:blank") {
            handleLoad();
            onLoad?.(urlData.id);
          }
        }, 500);
      }

      // Return cleanup function that removes event listeners
      return () => {
        iframe.removeEventListener("load", loadHandler);
        iframe.removeEventListener("error", errorHandler);
      };
    } else if (existingWrapper && !wrapperRef.current) {
      // If wrapper exists but we don't have a ref to it, store the ref
      wrapperRef.current = existingWrapper as HTMLDivElement;
      iframeRef.current = existingWrapper.querySelector(
        `[data-iframe-id="${urlData.id}"]`,
      ) as HTMLIFrameElement;
    }

    // Update position when container moves
    const observer = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && wrapperRef.current) {
        // Get the current appBar height
        const isMobileView = window.innerWidth < 600;
        const appBarHeight = isMobileView ? 56 : 64; // AppBar height changes at small screens

        wrapperRef.current.style.position = "fixed";
        wrapperRef.current.style.top = `${appBarHeight}px`;
        wrapperRef.current.style.left = `${rect.left}px`;
        wrapperRef.current.style.width = `${rect.width}px`;
        wrapperRef.current.style.height = `calc(var(--vh, 1vh) * 100 - ${appBarHeight}px)`;
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []); // Empty dependency array to ensure it only runs once on mount

  // Handle visibility changes separately
  useEffect(() => {
    if (!wrapperRef.current || !iframeRef.current) return;

    // Update visibility
    wrapperRef.current.style.visibility = urlData.isVisible ? "visible" : "hidden";
    wrapperRef.current.style.display = urlData.isVisible ? "block" : "none";
    wrapperRef.current.style.zIndex = urlData.isVisible ? "1" : "0";

    // Load URL only when visible and not already loaded
    if (urlData.isVisible) {
      // Get the current isMobile value at effect time, not closure time
      const currentIsMobile = window.matchMedia("(max-width:600px)").matches;
      const effectiveUrl = getEffectiveUrl(urlData, currentIsMobile);
      const currentSrc = iframeRef.current?.getAttribute("src") || undefined;

      // Only set src if it's empty or about:blank
      if (!currentSrc || currentSrc === "about:blank") {
        // Make sure we have a load handler to update the state
        const loadHandler = () => {
          if (iframeRef.current?.src && iframeRef.current.src !== "about:blank") {
            handleLoad();
            onLoad?.(urlData.id);
          }
        };

        // Remove any existing handler and add a new one
        iframeRef.current.removeEventListener("load", loadHandler);
        iframeRef.current.addEventListener("load", loadHandler);

        // Set the src to trigger the load event
        iframeRef.current.src = effectiveUrl;
      }
    }

    // Update the ref
    urlDataRef.current = urlData;
  }, [
    urlData.isVisible,
    urlData.url,
    urlData.urlMobile,
    urlData.isLocalhost,
    urlData.port,
    urlData.path,
    urlData.localhostMobilePort,
    urlData.localhostMobilePath,
    // Remove isMobile from dependencies
    handleLoad,
    onLoad,
    urlData.id,
  ]);

  return null; // This component only manages the imperative iframe
}

// Main container component
const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ urlGroups, initialUrlId, onLoad, onError, onUnload }, ref) {
    const { user } = useAuth();
    const { urls, activeUrlId, initializeUrls, selectUrl, unloadUrl, dispatch } =
      useUrlManager(urlGroups);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery("(max-width:600px)");
    const initialized = useRef(false);
    const { preferences } = useUserPreferences();
    const [showAdminEmptyState, setShowAdminEmptyState] = useState(false);

    // Check if there are no URLs or URL groups
    const hasNoUrls = urlGroups.length === 0 || urlGroups.every((group) => group.urls.length === 0);
    const isAdmin = user?.isAdmin || false;

    // Update container position when menu position changes
    useEffect(() => {
      if (preferences?.menuPosition) {
        updateGlobalContainerPosition(preferences.menuPosition);
      }
    }, [preferences?.menuPosition]);

    // Initialize URLs on mount
    useEffect(() => {
      if (!initialized.current && !hasNoUrls) {
        initializeUrls(initialUrlId);
        initialized.current = true;
      }

      // Set dataLoaded after a small delay to ensure all data is properly loaded
      const timer = setTimeout(() => {
        setShowAdminEmptyState(isAdmin && hasNoUrls);
      }, 2500);

      return () => clearTimeout(timer);
    }, [initializeUrls, initialUrlId, hasNoUrls]);

    // Create a memoized mapping of url IDs to avoid re-rendering IframeElements
    const urlIds = useMemo(() => Object.keys(urls), [urls]);

    // Create a custom onLoad handler that also updates the state
    const handleIframeLoad = useCallback(
      (urlId: string) => {
        // Mark the URL as loaded in the state
        dispatch({ type: "LOAD_URL", payload: { urlId } });

        // Call the original onLoad callback if provided
        onLoad?.(urlId);
      },
      [dispatch, onLoad],
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resetIframe: (urlId: string) => {
          const url = urls[urlId];
          if (!url) return;

          // If the URL is already active and loaded, we should only reset it
          // if the user explicitly wants to refresh the content
          const iframe = document.querySelector(`[data-iframe-id="${urlId}"]`) as HTMLIFrameElement;
          if (!iframe) return;

          // Check if the iframe actually has content loaded (not about:blank)
          const hasContent = iframe.src && iframe.src !== "about:blank";

          // If the iframe is already loaded with content, we should only
          // reset it if this is an explicit refresh action (e.g., clicking
          // on an already active URL in the menu)
          if (hasContent) {
            // For an already loaded iframe, store the current URL
            const currentUrl = iframe.src;

            // Reset the iframe
            iframe.src = "about:blank";
            setTimeout(() => {
              iframe.src = currentUrl;
              onLoad?.(urlId);
            }, 100);
          } else {
            // If the iframe doesn't have content, load it
            const effectiveUrl = getEffectiveUrl(url, isMobile);
            iframe.src = effectiveUrl;
            onLoad?.(urlId);
          }

          // Make sure the URL is marked as loaded in the state
          dispatch({ type: "LOAD_URL", payload: { urlId } });
        },
        unloadIframe: (urlId: string) => {
          unloadUrl(urlId);
          const iframe = document.querySelector(`[data-iframe-id="${urlId}"]`) as HTMLIFrameElement;
          if (iframe) {
            iframe.src = "about:blank";
            onUnload?.(urlId);
          }
        },
        reloadUnloadedIframe: (urlId: string) => {
          const url = urls[urlId];
          if (!url) return;

          // Only update state if the URL is not already loaded
          if (!url.isLoaded) {
            dispatch({ type: "LOAD_URL", payload: { urlId } });
          }

          // Get the current isMobile value at call time, not closure time
          const currentIsMobile = window.matchMedia("(max-width:600px)").matches;
          const effectiveUrl = getEffectiveUrl(url, currentIsMobile);
          const iframe = document.querySelector(`[data-iframe-id="${urlId}"]`) as HTMLIFrameElement;

          if (iframe) {
            iframe.src = effectiveUrl;
            onLoad?.(urlId);
          }
        },
        getLoadedUrlIds: () => Object.keys(urls).filter((id) => urls[id].isLoaded),
      }),
      // Remove isMobile from the dependency array to prevent recreation on screen size changes
      [urls, unloadUrl, selectUrl, onUnload, dispatch, onLoad],
    );

    return (
      <Box ref={containerRef} sx={{ width: "100%", height: "100%", position: "relative" }}>
        {showAdminEmptyState ? (
          <AdminEmptyState />
        ) : (
          <>
            {urlIds.map((urlId) => (
              <IframeElement
                key={urlId}
                urlData={urls[urlId]}
                isMobile={isMobile}
                onLoad={handleIframeLoad}
                onError={onError}
                containerRef={containerRef}
              />
            ))}
            {activeUrlId && urls[activeUrlId] && !urls[activeUrlId].isLoaded && (
              <UnloadedContent
                urlId={activeUrlId}
                onReload={(id) => {
                  selectUrl(id);
                  onLoad?.(id);
                }}
              />
            )}
          </>
        )}
      </Box>
    );
  },
);

export default IframeContainer;
