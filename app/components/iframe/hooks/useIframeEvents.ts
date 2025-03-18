"use client";

import { useEffect, useRef, useCallback } from "react";
import { useIframeContext } from "../state/IframeContext";

interface UseIframeEventsProps {
  urlId: string;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
}

export function useIframeEvents({ urlId, iframeRef, onLoad, onError }: UseIframeEventsProps) {
  const { dispatch } = useIframeContext();
  const eventsAttachedRef = useRef(false);

  // Handle iframe load event
  const handleLoad = useCallback(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const currentSrc = iframe.src;
    const targetUrl = iframe.getAttribute("data-url");

    // Only process load event if the iframe has valid content
    if (!currentSrc || currentSrc === "about:blank" || currentSrc === "") {
      return;
    }

    // Verify the loaded URL matches what we expected
    if (currentSrc === targetUrl) {
      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: "active-loaded" },
      });

      dispatch({
        type: "UPDATE_ACTIVITY",
        payload: { urlId },
      });

      // Try to adjust iframe size for same-origin content
      try {
        if (iframe.contentWindow && iframe.contentDocument) {
          const docHeight = iframe.contentDocument.body.scrollHeight;
          const docWidth = iframe.contentDocument.body.scrollWidth;

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
        // Silently fail for cross-origin content
        console.warn("Cross-origin iframe resize not allowed");
      }

      onLoad?.(urlId);
    } else {
      // If loaded URL doesn't match expected URL, treat as error
      handleError();
    }
  }, [urlId, iframeRef, dispatch, onLoad]);

  // Handle iframe error event
  const handleError = useCallback(() => {
    const error = "Failed to load the page";
    dispatch({
      type: "SET_ERROR",
      payload: { urlId, error },
    });
    onError?.(urlId, error);
  }, [urlId, dispatch, onError]);

  // Attach event listeners to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || eventsAttachedRef.current) return;

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);
    eventsAttachedRef.current = true;

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
      eventsAttachedRef.current = false;
    };
  }, [iframeRef, handleLoad, handleError]);

  // Setup message event listening for cross-origin iframe communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from our iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // Handle specific message types
      if (event.data && typeof event.data === "object") {
        // Example: Handle resize requests
        if (event.data.type === "resize" && event.data.height && event.data.width) {
          iframeRef.current.style.height = `${event.data.height}px`;
          iframeRef.current.style.width = `${event.data.width}px`;
        }

        // Handle activity updates
        if (event.data.type === "activity") {
          dispatch({
            type: "UPDATE_ACTIVITY",
            payload: { urlId },
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [urlId, iframeRef, dispatch]);

  return {
    handleLoad,
    handleError,
  };
}
