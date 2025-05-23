"use client";

import { useIframeLifecycle, useUrlManager } from "@/app/lib/hooks/useIframe";
import type { IframeContainerProps, IframeContainerRef, IframeUrl } from "@/app/types/iframe";
import { Box, useMediaQuery } from "@mui/material";
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

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

    if (document.body) {
      document.body.appendChild(globalIframeContainer);
    } else {
      console.error("Document body not available");
    }
  }
  return globalIframeContainer;
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Create iframe only once
  useEffect(() => {
    const container = getGlobalIframeContainer();
    if (!container || !containerRef.current) return;

    // Create wrapper div if it doesn't exist
    if (!wrapperRef.current) {
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
      const effectiveUrl = isMobile && urlData.urlMobile ? urlData.urlMobile : urlData.url;
      iframe.setAttribute("data-src", effectiveUrl);
      iframe.title = `iframe-${urlData.id}`;
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
      }
    }

    // Update position when container moves
    const observer = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && wrapperRef.current) {
        wrapperRef.current.style.position = "fixed";
        wrapperRef.current.style.top = `${rect.top}px`;
        wrapperRef.current.style.left = `${rect.left}px`;
        wrapperRef.current.style.width = `${rect.width}px`;
        wrapperRef.current.style.height = `${rect.height}px`;
      }
    });

    observer.observe(containerRef.current);

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [containerRef]); // Only depend on containerRef

  // Handle visibility changes separately
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.visibility = urlData.isVisible ? "visible" : "hidden";
      wrapperRef.current.style.display = urlData.isVisible ? "block" : "none";
      wrapperRef.current.style.zIndex = urlData.isVisible ? "1" : "0";

      // Load URL only if not already loaded
      if (urlData.isVisible && iframeRef.current && !iframeRef.current.src) {
        const effectiveUrl = isMobile && urlData.urlMobile ? urlData.urlMobile : urlData.url;
        iframeRef.current.src = effectiveUrl;
      }
    }
  }, [urlData.isVisible, urlData.url, urlData.urlMobile, isMobile]);

  return null; // This component only manages the imperative iframe
}

// Main container component
const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ urlGroups, initialUrlId, onLoad, onError, onUnload }, ref) {
    const { urls, activeUrlId, initializeUrls, selectUrl, unloadUrl } = useUrlManager(urlGroups);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery("(max-width:600px)");
    const initialized = useRef(false);

    // Initialize URLs on mount
    useEffect(() => {
      if (!initialized.current) {
        initializeUrls(initialUrlId);
        initialized.current = true;
      }
    }, [initializeUrls, initialUrlId]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      resetIframe: (urlId: string) => {
        const url = urls[urlId];
        if (url) {
          const effectiveUrl = isMobile && url.urlMobile ? url.urlMobile : url.url;
          const iframe = document.querySelector(`[data-iframe-id="${urlId}"]`) as HTMLIFrameElement;
          if (iframe) {
            iframe.src = "about:blank";
            setTimeout(() => {
              iframe.src = effectiveUrl;
            }, 100);
          }
        }
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
        selectUrl(urlId);
      },
      getLoadedUrlIds: () => Object.keys(urls).filter((id) => urls[id].isLoaded),
    }));

    return (
      <Box ref={containerRef} sx={{ width: "100%", height: "100%", position: "relative" }}>
        {Object.values(urls).map((urlData) => (
          <IframeElement
            key={urlData.id}
            urlData={urlData}
            isMobile={isMobile}
            onLoad={onLoad}
            onError={onError}
            containerRef={containerRef}
          />
        ))}
      </Box>
    );
  },
);

export default IframeContainer;
