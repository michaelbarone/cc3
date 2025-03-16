'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useIframeState } from '../state/iframe-state-context';
import { Url, UrlGroup } from '../types';

/**
 * Custom hook to manage iframe interactions and state.
 * Provides methods for working with iframes and manages the state.
 */
export function useIframeManager(urlGroups: UrlGroup[] = []) {
  // Get state methods from context
  const {
    activeUrlId,
    activeUrl,
    loadedUrlIds,
    knownUrlIds,
    setActiveUrl,
    addLoadedUrlId,
    removeLoadedUrlId
  } = useIframeState();

  // Refs for iframes
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // Find a URL by ID across all URL groups
  const findUrlById = useCallback((urlId: string): Url | null => {
    for (const group of urlGroups) {
      const url = group.urls.find(u => u.id === urlId);
      if (url) {
        return url;
      }
    }
    return null;
  }, [urlGroups]);

  // Handle browser navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const urlId = url.searchParams.get('url');

      if (urlId && urlId !== activeUrlId) {
        const url = findUrlById(urlId);
        if (url) {
          setActiveUrl(url);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeUrlId, findUrlById, setActiveUrl]);

  // Handle URL click
  const handleUrlClick = useCallback((url: Url) => {
    const isActive = url.id === activeUrlId;
    const isLoaded = loadedUrlIds.includes(url.id);

    if (isActive) {
      if (!isLoaded) {
        // Active but not loaded - reload it
        reloadIframe(url.id);
      } else {
        // Active and loaded - reload (refresh content)
        resetIframe(url.id);
      }
    } else {
      // Not active - make it active
      setActiveUrl(url);
    }
  }, [activeUrlId, loadedUrlIds, setActiveUrl]);

  // Reset (reload) an iframe
  const resetIframe = useCallback((urlId: string) => {
    const iframe = iframeRefs.current[urlId];
    if (iframe) {
      const url = iframe.src;

      // Clear the iframe
      iframe.src = 'about:blank';

      // Force a reflow then reload
      setTimeout(() => {
        if (iframe) iframe.src = url;
      }, 100);
    }
  }, []);

  // Unload an iframe (free resources)
  const unloadIframe = useCallback((urlId: string) => {
    const iframe = iframeRefs.current[urlId];
    if (iframe) {
      // Set to blank page
      iframe.src = 'about:blank';

      // Remove event listeners
      iframe.onload = null;
      iframe.onerror = null;

      // Clear reference
      iframeRefs.current[urlId] = null;

      // Update state
      removeLoadedUrlId(urlId);
    }
  }, [removeLoadedUrlId]);

  // Reload an unloaded iframe
  const reloadIframe = useCallback((urlId: string) => {
    const url = findUrlById(urlId);
    if (url) {
      // Create or update the iframe for this URL
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        iframe.src = url.url;
      }
    }
  }, [findUrlById]);

  // Handle iframe load event
  const handleIframeLoad = useCallback((urlId: string) => {
    addLoadedUrlId(urlId);
  }, [addLoadedUrlId]);

  // Handle iframe error event
  const handleIframeError = useCallback((urlId: string) => {
    removeLoadedUrlId(urlId);
  }, [removeLoadedUrlId]);

  // Set iframe reference
  const setIframeRef = useCallback((urlId: string, ref: HTMLIFrameElement | null) => {
    iframeRefs.current[urlId] = ref;
  }, []);

  return {
    activeUrlId,
    activeUrl,
    loadedUrlIds,
    knownUrlIds,
    handleUrlClick,
    resetIframe,
    unloadIframe,
    reloadIframe,
    handleIframeLoad,
    handleIframeError,
    setIframeRef,
    findUrlById
  };
}
