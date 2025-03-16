'use client';

import { useState, useRef, useEffect } from 'react';
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
}

interface IframeContainerProps {
  activeUrlId: string | null;
  activeUrl: Url | null;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
}

export default function IframeContainer({ activeUrlId, activeUrl, onLoad, onError }: IframeContainerProps) {
  const [iframeStates, setIframeStates] = useState<Record<string, IframeState>>({});
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  // Initialize an iframe state when a new URL is loaded
  useEffect(() => {
    if (activeUrl && activeUrlId) {
      // Only initialize if this URL hasn't been loaded before
      if (!iframeStates[activeUrlId]) {
        setIframeStates(prev => ({
          ...prev,
          [activeUrlId]: {
            id: activeUrlId,
            url: activeUrl.url,
            loading: true,
            error: null
          }
        }));
      }
    }
  }, [activeUrlId, activeUrl, iframeStates]);

  // Handle iframe load event
  const handleIframeLoad = (urlId: string) => {
    setIframeStates(prev => ({
      ...prev,
      [urlId]: {
        ...prev[urlId],
        loading: false,
        error: null
      }
    }));

    if (onLoad) onLoad(urlId);
  };

  // Handle iframe error event
  const handleIframeError = (urlId: string) => {
    const errorMessage = "Failed to load the page";

    setIframeStates(prev => ({
      ...prev,
      [urlId]: {
        ...prev[urlId],
        loading: false,
        error: errorMessage
      }
    }));

    if (onError) onError(urlId, errorMessage);
  };

  // Reset iframe
  const resetIframe = (urlId: string) => {
    const iframe = iframeRefs.current[urlId];
    if (iframe) {
      const url = iframe.src;
      iframe.src = '';

      // Force a reflow
      setTimeout(() => {
        iframe.src = url;
      }, 100);

      setIframeStates(prev => ({
        ...prev,
        [urlId]: {
          ...prev[urlId],
          loading: true,
          error: null
        }
      }));
    }
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

      {/* Create iframes for all URLs that have been accessed */}
      {Object.entries(iframeStates).map(([urlId, state]) => (
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
          }}
        >
          <iframe
            ref={el => { iframeRefs.current[urlId] = el; }}
            src={state.url}
            title={`iframe-${urlId}`}
            onLoad={() => handleIframeLoad(urlId)}
            onError={() => handleIframeError(urlId)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          />
        </Box>
      ))}
    </Box>
  );
}
