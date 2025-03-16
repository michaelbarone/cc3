'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';

// Types for URLs and iframe states
interface Url {
  id: string;
  title: string;
  url: string;
  iconPath?: string;
  displayOrder: number;
}

interface IframeState {
  id: string;
  url: string;
  loading: boolean;
  error: string | null;
  isUnloaded: boolean;
}

interface IframeContainerProps {
  activeUrlId: string | null;
  activeUrl: Url | null;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
}

// Define a ref type that exposes the iframe control methods
export interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer({ activeUrlId, activeUrl, onLoad, onError, onUnload }, ref) {
    const [iframeStates, setIframeStates] = useState<Record<string, IframeState>>({});
    const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
    const previousActiveUrlIdRef = useRef<string | null>(null);

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

    // Initialize an iframe state when a new URL is loaded
    useEffect(() => {
      if (activeUrl && activeUrlId) {
        // Handle change in active URL
        const newUrlSelected = activeUrlId !== previousActiveUrlIdRef.current;
        previousActiveUrlIdRef.current = activeUrlId;

        // Check if the iframe exists in our states
        if (!iframeStates[activeUrlId]) {
          // Create a new iframe state for a completely new URL
          setIframeStates(prev => ({
            ...prev,
            [activeUrlId]: {
              id: activeUrlId,
              url: activeUrl.url,
              loading: true,
              error: null,
              isUnloaded: false
            }
          }));
        } else if (iframeStates[activeUrlId].isUnloaded && newUrlSelected) {
          // If it exists but is unloaded and was just selected, reload it
          reloadUnloadedIframe(activeUrlId);
        }
      }
    }, [activeUrlId, activeUrl, iframeStates]);

    // Handle iframe load event
    const handleIframeLoad = (urlId: string) => {
      // Check if the iframe is actually loaded with content (not empty src)
      const iframe = iframeRefs.current[urlId];
      if (iframe && (!iframe.src || iframe.src === 'about:blank')) {
        // Don't mark empty iframes as loaded
        return;
      }

      setIframeStates(prev => ({
        ...prev,
        [urlId]: {
          ...prev[urlId],
          loading: false,
          error: null,
          isUnloaded: false
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
          ...prev[urlId],
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
        const url = iframe.src;
        iframe.src = 'about:blank';

        // Force a reflow
        setTimeout(() => {
          iframe.src = url;
        }, 100);

        setIframeStates(prev => ({
          ...prev,
          [urlId]: {
            ...prev[urlId],
            loading: true,
            error: null,
            isUnloaded: false
          }
        }));
      }
    };

    // Unload iframe - completely remove it from state to free resources
    const unloadIframe = (urlId: string) => {
      const iframe = iframeRefs.current[urlId];
      if (iframe) {
        // Save the current URL in the state
        const currentUrl = iframe.src;

        // Properly clean up the iframe
        iframe.src = 'about:blank'; // First set to blank page

        // Remove event listeners
        iframe.onload = null;
        iframe.onerror = null;

        // Clear the reference
        iframeRefs.current[urlId] = null;

        setIframeStates(prev => ({
          ...prev,
          [urlId]: {
            ...prev[urlId],
            url: currentUrl, // Save the URL for later reloading
            loading: false,
            error: null,
            isUnloaded: true
          }
        }));

        if (onUnload) onUnload(urlId);
      }
    };

    // Explicit reload function for unloaded iframes
    const reloadUnloadedIframe = (urlId: string) => {
      if (iframeStates[urlId]?.isUnloaded) {
        const savedUrl = iframeStates[urlId].url;

        // First update the state to indicate loading and not unloaded
        setIframeStates(prev => ({
          ...prev,
          [urlId]: {
            ...prev[urlId],
            loading: true,
            isUnloaded: false
          }
        }));

        // After state update, ensure the iframe is created with the saved URL
        // Use setTimeout to ensure it happens after the state update and re-render
        setTimeout(() => {
          const newIframe = iframeRefs.current[urlId];
          if (newIframe) {
            // If somehow we already have a reference to an iframe, set its src
            newIframe.src = savedUrl;
          } else {
            // Force a re-render to create the iframe if needed
            setIframeStates(prev => ({
              ...prev,
              [urlId]: {
                ...prev[urlId],
                loading: true,
                isUnloaded: false,
                url: savedUrl
              }
            }));
          }
        }, 50);
      }
    };

    // Create iframe element for a URL that needs to be displayed
    const createIframeElement = (urlId: string, url: string) => {
      return (
        <iframe
          ref={el => { iframeRefs.current[urlId] = el; }}
          src={url}
          title={`iframe-${urlId}`}
          onLoad={() => handleIframeLoad(urlId)}
          onError={() => handleIframeError(urlId)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
            overflow: 'hidden'
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    };

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

        {/* Create iframes for all URLs that have been accessed and are not unloaded */}
        {Object.entries(iframeStates).map(([urlId, state]) => {
          // Skip rendering iframes that are unloaded
          if (state.isUnloaded) {
            return null;
          }

          return (
            <Box
              key={urlId}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                visibility: activeUrlId === urlId ? 'visible' : 'hidden',
                zIndex: activeUrlId === urlId ? 1 : 0,
                overflow: 'hidden'
              }}
            >
              {createIframeElement(urlId, state.url)}
            </Box>
          );
        })}
      </Box>
    );
  }
);

export default IframeContainer;
