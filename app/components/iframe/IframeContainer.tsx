"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Box, useMediaQuery } from "@mui/material";
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

      // Clear any existing iframes
      container.innerHTML = "";

      // Create iframes for all URLs
      urlGroups.forEach((group) => {
        if (!group?.urls?.length) return;

        group.urls.forEach((urlData) => {
          if (!urlData?.id || !urlData?.url) {
            console.warn("Invalid URL data", urlData);
            return;
          }

          const { id: urlId, url, urlMobile } = urlData;
          const effectiveUrl = isMobile && urlMobile ? urlMobile : url;

          // Create wrapper div
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
          wrapper.style.zIndex = urlId === activeUrlId ? "1" : "0";

          // Create iframe
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
      };
    }, [urlGroups, activeUrlId, isMobile, onLoad, onError]);

    // Handle active URL changes
    useEffect(() => {
      if (!activeUrlId) return;

      // Update visibility
      Object.entries(iframeRefs.current).forEach(([urlId, iframe]) => {
        const wrapper = iframe.parentElement;
        if (wrapper) {
          wrapper.style.visibility = urlId === activeUrlId ? "visible" : "hidden";
          wrapper.style.zIndex = urlId === activeUrlId ? "1" : "0";
        }
      });

      // Load active iframe if needed
      const activeIframe = iframeRefs.current[activeUrlId];
      if (activeIframe && (!activeIframe.src || activeIframe.src === "about:blank")) {
        activeIframe.src = activeIframe.getAttribute("data-src") || "";
      }
    }, [activeUrlId]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resetIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            const url = iframe.getAttribute("data-src");
            if (url) {
              iframe.src = url;
            }
          }
        },
        unloadIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            iframe.src = "";
            onUnload?.(urlId);
          }
        },
        reloadUnloadedIframe: (urlId: string) => {
          const iframe = iframeRefs.current[urlId];
          if (iframe) {
            const url = iframe.getAttribute("data-src");
            if (url) {
              iframe.src = url;
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
