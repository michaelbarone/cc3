"use client";

import { Box, useMediaQuery } from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useIframeContext } from "./state/IframeContext";

// Types for props
interface IframeContainerProps {
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
  urlGroups?: {
    id: string;
    urls: {
      id: string;
      url: string;
      urlMobile?: string | null;
      idleTimeoutMinutes?: number;
    }[];
  }[];
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

    // Ensure the container is added to the body
    if (document.body) {
      document.body.appendChild(globalIframeContainer);
    } else {
      console.error("Document body not available");
    }
  }
  return globalIframeContainer;
}

const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ onLoad, onError, onUnload, urlGroups = [] }, ref) {
    const { activeUrlId } = useIframeContext();
    const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery("(max-width:600px)");
    const initialized = useRef(false);

    // Create iframes on mount
    useEffect(() => {
      if (!document.body) {
        console.error("Document body not available for iframe initialization");
        return;
      }

      // Get or create the global container
      const container = getGlobalIframeContainer();
      if (!container) {
        console.error("Failed to create global iframe container");
        return;
      }

      // Track existing and needed iframe IDs
      const existingIframeIds = new Set(Object.keys(iframeRefs.current));
      const neededIframeIds = new Set<string>();

      // Create or update iframes for all URLs
      urlGroups.forEach((group) => {
        if (!group?.urls?.length) return;

        group.urls.forEach((urlData) => {
          if (!urlData?.id || !urlData?.url) {
            console.warn("Invalid URL data", urlData);
            return;
          }

          const { id: urlId, url, urlMobile } = urlData;
          neededIframeIds.add(urlId);
          const effectiveUrl = isMobile && urlMobile ? urlMobile : url;

          // If iframe already exists, just update its data-src if needed
          if (existingIframeIds.has(urlId)) {
            const existingIframe = iframeRefs.current[urlId];
            const currentDataSrc = existingIframe.getAttribute("data-src");
            if (currentDataSrc !== effectiveUrl) {
              existingIframe.setAttribute("data-src", effectiveUrl);
              // Only update src if this is the active iframe and it's currently loaded
              if (
                urlId === activeUrlId &&
                existingIframe.src &&
                existingIframe.src !== "about:blank"
              ) {
                existingIframe.src = effectiveUrl;
              }
            }
            return;
          }

          // Create wrapper div for new iframe
          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-iframe-container", urlId);
          wrapper.style.position = "absolute";
          wrapper.style.top = "0";
          wrapper.style.left = "0";
          wrapper.style.width = "100%";
          wrapper.style.height = "100%";
          wrapper.style.overflow = "hidden";
          wrapper.style.pointerEvents = "auto";
          wrapper.style.visibility = urlId === activeUrlId ? "visible" : "hidden";
          wrapper.style.display = urlId === activeUrlId ? "block" : "none";
          wrapper.style.zIndex = urlId === activeUrlId ? "1" : "0";

          // Create new iframe
          const iframe = document.createElement("iframe");
          iframe.setAttribute("data-iframe-id", urlId);
          iframe.setAttribute("data-src", effectiveUrl);
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

          // Add load and error handlers
          iframe.addEventListener("load", () => {
            if (iframe.src && iframe.src !== "about:blank") {
              onLoad?.(urlId);
            }
          });

          iframe.addEventListener("error", () => {
            onError?.(urlId, "Failed to load content");
          });

          // Store ref
          iframeRefs.current[urlId] = iframe;

          // Add to DOM
          wrapper.appendChild(iframe);
          container.appendChild(wrapper);

          // Load active iframe
          if (urlId === activeUrlId) {
            iframe.src = effectiveUrl;
          }
        });
      });

      // Remove any iframes that are no longer needed
      existingIframeIds.forEach((urlId) => {
        if (!neededIframeIds.has(urlId)) {
          const iframe = iframeRefs.current[urlId];
          if (iframe && iframe.parentElement) {
            iframe.parentElement.remove();
          }
          delete iframeRefs.current[urlId];
        }
      });

      // Update container position when our container moves
      const observer = new ResizeObserver(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          Object.values(iframeRefs.current).forEach((iframe) => {
            if (iframe.parentElement) {
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

      initialized.current = true;

      return () => {
        observer.disconnect();
        initialized.current = false;

        // Remove all iframes
        Object.values(iframeRefs.current).forEach((iframe) => {
          if (iframe.parentElement) {
            iframe.parentElement.remove();
          }
        });
        iframeRefs.current = {};

        // Only remove the global container if it's empty and this is the last instance
        if (container && container.childNodes.length === 0) {
          container.remove();
          globalIframeContainer = null;
        }
      };
    }, [urlGroups, activeUrlId, isMobile, onLoad, onError]);

    // Handle active URL changes
    useEffect(() => {
      if (!activeUrlId) return;

      // Update visibility and ensure proper loading
      Object.entries(iframeRefs.current).forEach(([urlId, iframe]) => {
        const wrapper = iframe.parentElement;
        const isActive = urlId === activeUrlId;

        if (wrapper) {
          // Force a reflow by accessing offsetHeight
          wrapper.offsetHeight;

          // Update visibility and z-index
          wrapper.style.display = isActive ? "block" : "none";
          wrapper.style.visibility = isActive ? "visible" : "hidden";
          wrapper.style.zIndex = isActive ? "1" : "0";
          wrapper.style.pointerEvents = isActive ? "auto" : "none";

          // Load the iframe content if it's active and not already loaded
          if (isActive && (!iframe.src || iframe.src === "about:blank")) {
            const effectiveUrl = iframe.getAttribute("data-src");
            if (effectiveUrl) {
              iframe.src = effectiveUrl;
            }
          }
        }
      });
    }, [activeUrlId]);

    // Expose control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resetIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            const dataSrc = iframe.getAttribute("data-src");
            if (dataSrc) {
              iframe.src = dataSrc;
            }
          }
        },
        unloadIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            iframe.src = "about:blank";
            onUnload?.(urlId);
          }
        },
        reloadUnloadedIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe && (!iframe.src || iframe.src === "about:blank")) {
            const dataSrc = iframe.getAttribute("data-src");
            if (dataSrc) {
              iframe.src = dataSrc;
            }
          }
        },
        getLoadedUrlIds: () => {
          return Object.entries(iframeRefs.current)
            .filter(([, iframe]) => iframe.src && iframe.src !== "about:blank")
            .map(([urlId]) => urlId);
        },
      }),
      [onUnload],
    );

    // Render the container
    return (
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      />
    );
  },
);

export default IframeContainer;
