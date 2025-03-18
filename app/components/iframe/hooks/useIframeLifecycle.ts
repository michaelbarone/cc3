"use client";

import { useEffect, useRef, useCallback } from "react";
import { useIframeContext } from "../state/IframeContext";
import { useGlobalIframeContainer } from "./useGlobalIframeContainer";
import { IframeStatus } from "@/app/types/iframe";

interface UseIframeLifecycleOptions {
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
}

interface UseIframeLifecycleReturn {
  loadIframe: (urlId: string, url: string) => void;
  unloadIframe: (urlId: string) => void;
  resetIframe: (urlId: string) => void;
}

export function useIframeLifecycle(
  urlId: string,
  options: UseIframeLifecycleOptions = {},
): UseIframeLifecycleReturn {
  const { dispatch } = useIframeContext();
  const { createIframe, removeIframe } = useGlobalIframeContainer();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { onLoad, onError, onUnload } = options;

  // Handle iframe load event
  const handleLoad = useCallback(() => {
    if (!iframeRef.current) return;

    const currentSrc = iframeRef.current.src;
    const targetUrl = iframeRef.current.getAttribute("data-url");

    // Only process load event if the iframe has valid content
    if (!currentSrc || currentSrc === "about:blank" || currentSrc === "") {
      return;
    }

    // Verify the loaded URL matches what we expected
    if (currentSrc === targetUrl) {
      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: "active-loaded" as IframeStatus },
      });

      dispatch({
        type: "UPDATE_ACTIVITY",
        payload: { urlId },
      });

      onLoad?.(urlId);
    } else {
      // If loaded URL doesn't match expected URL, treat as error
      handleError();
    }
  }, [urlId, dispatch, onLoad]);

  // Handle iframe error event
  const handleError = useCallback(() => {
    const error = "Failed to load the page";
    dispatch({
      type: "SET_ERROR",
      payload: { urlId, error },
    });
    onError?.(urlId, error);
  }, [urlId, dispatch, onError]);

  // Load iframe with content
  const loadIframe = useCallback(
    (urlId: string, url: string) => {
      let iframe = iframeRef.current;

      if (!iframe) {
        iframe = createIframe(urlId, url);
        iframeRef.current = iframe;

        // Add event listeners
        iframe.addEventListener("load", handleLoad);
        iframe.addEventListener("error", handleError);
      }

      // Update state to loading
      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: "active-unloaded" as IframeStatus },
      });

      // Set the URL to load content
      if (url && url !== "about:blank") {
        iframe.src = url;
      }
    },
    [urlId, createIframe, dispatch, handleLoad, handleError],
  );

  // Unload iframe content
  const unloadIframe = useCallback(
    (urlId: string) => {
      if (iframeRef.current) {
        // Store the current URL as data attribute before clearing
        const currentSrc = iframeRef.current.src;
        if (currentSrc && currentSrc !== "about:blank") {
          iframeRef.current.setAttribute("data-src", currentSrc);
        }
        iframeRef.current.src = "";

        dispatch({
          type: "SET_STATUS",
          payload: { urlId, status: "inactive-unloaded" as IframeStatus },
        });

        onUnload?.(urlId);
      }
    },
    [urlId, dispatch, onUnload],
  );

  // Reset iframe - reload current URL
  const resetIframe = useCallback(
    (urlId: string) => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const url = iframe.getAttribute("data-url") || iframe.getAttribute("data-src");
      if (!url) return;

      // Clear the source
      iframe.src = "about:blank";

      // Force a reflow
      setTimeout(() => {
        if (iframe) {
          iframe.src = url;
        }
      }, 50);

      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: "active-unloaded" as IframeStatus },
      });
    },
    [urlId, dispatch],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener("load", handleLoad);
        iframeRef.current.removeEventListener("error", handleError);
        removeIframe(urlId);
        iframeRef.current = null;
      }
    };
  }, [urlId, removeIframe, handleLoad, handleError]);

  return {
    loadIframe,
    unloadIframe,
    resetIframe,
  };
}
