'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { Url } from '@/app/lib/types';

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

const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ activeUrlId, activeUrl, onLoad, onError, onUnload, urlGroups = [] }, ref) {
    const [iframeStates, setIframeStates] = useState<Record<string, IframeState>>({});
    const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
    const previousActiveUrlIdRef = useRef<string | null>(null);

    // Track all available URLs
    const allUrls = useRef<Record<string, string>>({});

    // Reference for idle timeout checking interval
    const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Convert the ref to a stable state value to prevent memo dependency issues
    const [allUrlsMap, setAllUrlsMap] = useState<Record<string, string>>({});

    // Track active URL ID in a ref to avoid re-renders
    const activeUrlIdRef = useRef<string | null>(null);

    // Container ref for iframes
    const iframeContainerRef = useRef<HTMLDivElement | null>(null);

    // Update ref whenever the prop changes
    useEffect(() => {
      activeUrlIdRef.current = activeUrlId;
    }, [activeUrlId]);

    // Set up idle check interval
    useEffect(() => {
      // Start the interval if it's not already running
      if (!idleCheckIntervalRef.current) {
        idleCheckIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const activeIframes = Object.entries(iframeStates).filter(
            ([, state]) => !state.loading && !state.error && !state.isUnloaded
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
              console.log(`Unloading iframe ${urlId} due to ${state.idleTimeoutMinutes} minutes of inactivity`);
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

    // Collect all URLs from URL groups and store in state instead of ref
    useEffect(() => {
      const urls: Record<string, string> = {};

      // Extract all URLs from urlGroups
      urlGroups.forEach(group => {
        group.urls.forEach(url => {
          urls[url.id] = url.url;
        });
      });

      // Update state instead of ref
      setAllUrlsMap(urls);

      // Keep ref for backwards compatibility with existing code
      allUrls.current = urls;

      console.log('Available URLs:', Object.keys(urls).length);
    }, [urlGroups]);

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
        return Object.keys(iframeStates).filter(
          (urlId) => !iframeStates[urlId].loading &&
                      !iframeStates[urlId].error &&
                      !iframeStates[urlId].isUnloaded
        );
      }
    }));

    // Function to toggle iframe visibility based on active URL
    const updateIframeVisibility = (urlId: string, isActive: boolean) => {
      const container = document.querySelector(`[data-iframe-container="${urlId}"]`);
      if (container) {
        const prevDisplay = (container as HTMLElement).style.display;
        const newDisplay = isActive ? 'block' : 'none';

        if (prevDisplay !== newDisplay) {
          console.log(`Changing visibility for iframe ${urlId}: ${prevDisplay} -> ${newDisplay}`);
          (container as HTMLElement).style.display = newDisplay;
        }
      }
    };

    // Function to update iframe src attributes directly - NEVER CLEAR SRC when switching
    const updateIframeSrc = (urlId: string, src: string | null) => {
      const iframe = iframeRefs.current[urlId];
      if (!iframe) return;

      const prevSrc = iframe.src;

      if (src === null || src === '') {
        // If explicitly unloading, save current URL to data-url attribute
        if (iframe.src && iframe.src !== 'about:blank' && iframe.src !== '') {
          iframe.setAttribute('data-url', iframe.src);
          console.log(`Saved URL to data-url for iframe ${urlId}: ${iframe.src}`);
        }

        // Only clear src if this is an EXPLICIT unload operation (not just switching tabs)
        if (src === null) { // null indicates explicit unload request
          iframe.src = '';
          console.log(`Explicitly unloaded iframe ${urlId}: ${prevSrc} -> ""`);
        } else {
          console.log(`Skipped clearing src for iframe ${urlId} - just switching tabs`);
        }
      } else {
        // Update src with the provided value
        console.log(`Setting src for iframe ${urlId}: ${prevSrc.substring(0, 30)}... -> ${src.substring(0, 30)}...`);
        iframe.src = src;
      }
    };

    // Handle iframe creation and management entirely through DOM
    useEffect(() => {
      // Only run once when the URL map is populated
      if (Object.keys(allUrlsMap).length === 0 || !iframeContainerRef.current) {
        return;
      }

      console.log('Creating iframe DOM elements imperatively (once only)');
      const container = iframeContainerRef.current;

      // Create all iframe elements
      Object.entries(allUrlsMap).forEach(([urlId, url]) => {
        // Check if iframe already exists to avoid duplicates
        if (document.querySelector(`[data-iframe-id="${urlId}"]`)) {
          return;
        }

        // Create iframe wrapper
        const wrapperDiv = document.createElement('div');
        wrapperDiv.setAttribute('data-iframe-container', urlId);
        wrapperDiv.style.position = 'absolute';
        wrapperDiv.style.top = '0';
        wrapperDiv.style.left = '0';
        wrapperDiv.style.width = '100%';
        wrapperDiv.style.height = '100%';
        wrapperDiv.style.overflow = 'hidden';
        wrapperDiv.style.display = urlId === activeUrlId ? 'block' : 'none';
        wrapperDiv.style.zIndex = urlId === activeUrlId ? '1' : '0';

        // Create iframe element
        const iframe = document.createElement('iframe');
        iframe.setAttribute('data-iframe-id', urlId);
        iframe.setAttribute('data-url', url);
        iframe.title = `iframe-${urlId}`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.background = '#fff';
        iframe.style.overflow = 'hidden';
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');
        iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');

        // Set src for all iframes right away to prevent unnecessary reloads
        // This ensures we don't lose iframe content when switching between tabs
        iframe.src = url;

        // Add event listeners
        iframe.addEventListener('load', () => {
          // Only trigger load event for non-empty src
          if (iframe.src && iframe.src !== 'about:blank' && iframe.src !== '') {
            handleIframeLoad(urlId);
          }
        });

        iframe.addEventListener('error', () => {
          handleIframeError(urlId);
        });

        // Store ref to the iframe
        iframeRefs.current[urlId] = iframe;

        // Add iframe to wrapper and wrapper to container
        wrapperDiv.appendChild(iframe);
        container.appendChild(wrapperDiv);
      });

      // Initial visibility update
      if (activeUrlId) {
        updateIframeVisibility(activeUrlId, true);
      }
    }, [allUrlsMap]);

    // Update iframe visibility when active URL changes
    useEffect(() => {
      if (!activeUrlId || Object.keys(allUrlsMap).length === 0) {
        return;
      }

      console.log(`Active URL changed to: ${activeUrlId}`);

      // ONLY update visibility for all iframes - never mess with src attributes when just switching tabs
      Object.keys(allUrlsMap).forEach(urlId => {
        updateIframeVisibility(urlId, urlId === activeUrlId);
      });

      // Handle change in active URL
      const newUrlSelected = activeUrlId !== previousActiveUrlIdRef.current;
      const previousUrlId = previousActiveUrlIdRef.current;

      if (newUrlSelected) {
        // Update previous URL reference
        previousActiveUrlIdRef.current = activeUrlId;

        // Get URL from the data attribute, URL mapping, or the activeUrl prop
        const targetUrl = allUrlsMap[activeUrlId];
        if (!targetUrl) return;

        // Check if the iframe exists
        const iframe = iframeRefs.current[activeUrlId];
        if (iframe) {
          // Check if the iframe is already loaded
          const isContentLoaded = iframe.src && iframe.src !== '' && iframe.src !== 'about:blank';

          // Only load content if the iframe has no content or if it's marked as unloaded
          if (!isContentLoaded || iframeStates[activeUrlId]?.isUnloaded) {
            console.log(`Loading iframe content for ${activeUrlId} with URL: ${targetUrl}`);

            // Set loading state first
            setIframeStates(prev => ({
              ...prev,
              [activeUrlId]: {
                ...prev[activeUrlId] || {
                  id: activeUrlId,
                  url: targetUrl,
                  idleTimeoutMinutes: activeUrl?.idleTimeoutMinutes || 10
                },
                loading: true,
                error: null,
                isUnloaded: false,
                lastActivityTime: Date.now()
              }
            }));

            // Update the iframe src directly - ONLY set, never clear
            updateIframeSrc(activeUrlId, targetUrl);
          } else {
            // Just update activity time when iframe is already loaded
            updateIframeActivity(activeUrlId);
          }
        }

        // ** IMPORTANT: Never clear the previous iframe's src, just hide it **
        if (previousUrlId) {
          // Update last activity time for the previous URL
          updateIframeActivity(previousUrlId);
        }
      }
    }, [activeUrlId, allUrlsMap, activeUrl]);

    // Function to update the activity time for an iframe
    const updateIframeActivity = (urlId: string) => {
      setIframeStates(prev => {
        if (!prev[urlId]) return prev;

        // If nothing has changed other than lastActivityTime, return the same object
        // to prevent unnecessary rerenders
        const currentTime = Date.now();
        if (Math.abs(currentTime - prev[urlId].lastActivityTime) < 1000) {
          return prev; // Skip update if less than 1 second difference
        }

        return {
          ...prev,
          [urlId]: {
            ...prev[urlId],
            lastActivityTime: currentTime
          }
        };
      });
    };

    // Handle iframe load event
    const handleIframeLoad = (urlId: string) => {
      // Check if the iframe is actually loaded with content (not empty src)
      const iframe = iframeRefs.current[urlId];
      if (iframe && (!iframe.src || iframe.src === 'about:blank' || iframe.src === '')) {
        // Don't mark empty iframes as loaded
        return;
      }

      setIframeStates(prev => ({
        ...prev,
        [urlId]: {
          ...prev[urlId] || {
            id: urlId,
            url: iframe?.src || allUrlsMap[urlId] || '',
            idleTimeoutMinutes: 10
          },
          loading: false,
          error: null,
          isUnloaded: false,
          lastActivityTime: Date.now() // Reset activity time on load
        }
      }));

      // Auto-resize the iframe to avoid scrollbars
      if (iframe) {
        try {
          // Try to adjust content to fit without scrollbars
          adjustIframeSize(iframe);
        } catch {
          // Silently fail if cross-origin
          console.warn('Cross-origin iframe resize not allowed');
        }
      }

      if (onLoad) onLoad(urlId);
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
            iframe.contentDocument.body.style.overflow = 'hidden';
          }
        }
      } catch {
        // Silently fail if cross-origin
        console.warn('Cross-origin iframe resize not allowed');
      }
    };

    // Handle iframe error event
    const handleIframeError = (urlId: string) => {
      const errorMessage = "Failed to load the page";

      setIframeStates(prev => ({
        ...prev,
        [urlId]: {
          ...prev[urlId] || {
            id: urlId,
            url: allUrlsMap[urlId] || '',
            idleTimeoutMinutes: 10
          },
          loading: false,
          error: errorMessage,
          isUnloaded: false
        }
      }));

      if (onError) onError(urlId, errorMessage);
    };

    // Reset iframe - reload the current URL
    const resetIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        const url = iframe.getAttribute('data-url') || iframe.src || allUrlsMap[urlId];
        if (!url) return;

        // Use our imperative update function
        updateIframeSrc(urlId, 'about:blank');

        // Force a reflow
        setTimeout(() => {
          updateIframeSrc(urlId, url);
        }, 100);

        setIframeStates(prev => ({
          ...prev,
          [urlId]: {
            ...prev[urlId] || {
              id: urlId,
              url,
              idleTimeoutMinutes: 10
            },
            loading: true,
            error: null,
            isUnloaded: false
          }
        }));
      }
    };

    // Unload iframe - keep in DOM but clear the source
    // ONLY called for explicit unload operations (like idle timeout)
    const unloadIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        // Use our imperative update function to clear src - pass null to indicate explicit unload
        updateIframeSrc(urlId, null);  // null means explicitly unload it

        setIframeStates(prev => ({
          ...prev,
          [urlId]: {
            ...prev[urlId] || {
              id: urlId,
              url: iframe.getAttribute('data-url') || allUrlsMap[urlId] || '',
              idleTimeoutMinutes: 10
            },
            loading: false,
            error: null,
            isUnloaded: true
          }
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
      const url = iframe.getAttribute('data-url') ||
                (iframeStates[urlId]?.url) ||
                allUrlsMap[urlId] ||
                (activeUrl?.id === urlId ? activeUrl.url : null);

      // If we can't determine the URL, we can't reload
      if (!url) {
        console.warn(`Cannot reload iframe ${urlId}: URL not found`);
        return;
      }

      // Update state first
      setIframeStates(prev => ({
        ...prev,
        [urlId]: {
          ...prev[urlId] || {
            id: urlId,
            url,
            idleTimeoutMinutes: 10
          },
          loading: true,
          error: null,
          isUnloaded: false,
          lastActivityTime: Date.now() // Reset activity time on reload
        }
      }));

      // Then load the URL using our imperative update function
      setTimeout(() => {
        updateIframeSrc(urlId, url);
      }, 50);
    };

    // Add debug logging to track iframe lifecycle
    useEffect(() => {
      const activeCount = Object.keys(iframeStates).filter(
        id => !iframeStates[id].isUnloaded && !iframeStates[id].loading && !iframeStates[id].error
      ).length;

      console.log(`Active iframe count: ${activeCount}`);
      console.log(`Current active URL: ${activeUrlIdRef.current}`);

      // Only log details if there are states to log
      if (Object.keys(iframeStates).length > 0) {
        console.log('Iframe states:', Object.keys(iframeStates).map(id => ({
          id,
          isActive: id === activeUrlIdRef.current,
          isUnloaded: iframeStates[id].isUnloaded,
          isLoading: iframeStates[id].loading,
          hasError: !!iframeStates[id].error,
          url: iframeStates[id].url.substring(0, 30) + '...'
        })));
      }
    }, [iframeStates]);

    if (!activeUrl || !activeUrlId) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            bgcolor: 'background.paper'
          }}
        >
          <Alert severity="info">Select a URL from the menu to display content</Alert>
        </Box>
      );
    }

    const currentIframeState = iframeStates[activeUrlId];

    return (
      <Box sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Loading indicator */}
        {currentIframeState?.loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.1)',
              zIndex: 10
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Error message */}
        {currentIframeState?.error && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: 2,
              zIndex: 10
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
                    border: 'none',
                    bgcolor: 'transparent',
                    color: 'primary.main',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
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
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              zIndex: 10
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
                    border: 'none',
                    bgcolor: 'transparent',
                    color: 'primary.main',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
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

        {/* Container div for imperatively created iframes */}
        <div
          ref={iframeContainerRef}
          style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            overflow: 'hidden'
          }}
        />
      </Box>
    );
  }
);

export default IframeContainer;
