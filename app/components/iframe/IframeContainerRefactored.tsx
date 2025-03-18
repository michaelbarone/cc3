"use client";

import React, { Component, forwardRef, useRef, useImperativeHandle, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

import { IframeWrapper } from "./IframeWrapper";
import { useIframeState } from "@/app/lib/state/iframe-state-context";
import { useGlobalIframeContainer } from "./hooks/useGlobalIframeContainer";

// Props interface for the main container
export interface IframeContainerProps {
  activeUrlId: string | null;
  activeUrl: {
    id: string;
    url: string;
    urlMobile?: string | null;
    idleTimeout?: number;
  } | null;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
  urlGroups?: Array<{
    id: string;
    name: string;
    urls: Array<{
      id: string;
      url: string;
      urlMobile?: string | null;
      idleTimeout?: number;
    }>;
  }>;
}

// Define a ref type that exposes the iframe control methods
export interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

// Props for the ErrorBoundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

// State for the ErrorBoundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component implementation (React doesn't have a built-in one)
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <this.props.FallbackComponent
          error={this.state.error as Error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error fallback component
 */
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        height: "100%",
      }}
    >
      <Typography variant="h6" color="error" gutterBottom>
        Something went wrong with the iframe container
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {error.message}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<RefreshIcon />}
        onClick={resetErrorBoundary}
      >
        Reset Container
      </Button>
    </Box>
  );
}

/**
 * The main iframe container wrapper with error boundary
 */
function IframeContainerWithErrorBoundary(props: IframeContainerProps & { children: ReactNode }) {
  return <ErrorBoundary FallbackComponent={ErrorFallback}>{props.children}</ErrorBoundary>;
}

/**
 * Main IframeContainer component that manages iframes outside of React's DOM
 */
const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainer(props, ref) {
    const { activeUrlId, urlGroups = [], onLoad, onError } = props;

    // Container for local state references
    const containerRef = useRef<HTMLDivElement>(null);

    // Get the iframe state context
    const iframeState = useIframeState();
    const { resetIframe, unloadIframe, reloadIframe, loadedUrlIds, addLoadedUrlId } = iframeState;

    // Setup the global container for iframes
    useGlobalIframeContainer();

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resetIframe: (urlId: string) => resetIframe(urlId),
        unloadIframe: (urlId: string) => unloadIframe(urlId),
        reloadIframe: (urlId: string) => reloadIframe(urlId),
        getLoadedUrlIds: () => loadedUrlIds,
      }),
      [resetIframe, unloadIframe, reloadIframe, loadedUrlIds],
    );

    // Extract all URLs from groups for tracking
    const allUrls = urlGroups.flatMap((group) => group.urls);

    return (
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "background.paper",
        }}
      >
        {/* We don't render IframeWrappers directly when refactored fully */}
        {/* This is a simplified implementation for the initial refactoring */}
        {allUrls.map((url) => {
          const urlId = url.id;
          const isActive = urlId === activeUrlId;

          return (
            <IframeWrapper
              key={urlId}
              id={urlId}
              url={url.url}
              urlMobile={url.urlMobile || null}
              status={
                isActive
                  ? "active-loaded"
                  : loadedUrlIds.includes(urlId)
                    ? "inactive-loaded"
                    : "inactive-unloaded"
              }
              error={null}
              isActive={isActive}
              onLoad={() => {
                addLoadedUrlId(urlId);
                onLoad?.(urlId);
              }}
              onError={(error) => onError?.(urlId, error)}
              onReload={() => reloadIframe(urlId)}
            />
          );
        })}
      </Box>
    );
  },
);

/**
 * Export the error boundary wrapped component as default
 */
export default forwardRef<IframeContainerRef, IframeContainerProps>(
  function IframeContainerWithBoundary(props, ref) {
    return (
      <IframeContainerWithErrorBoundary {...props}>
        <IframeContainer {...props} ref={ref} />
      </IframeContainerWithErrorBoundary>
    );
  },
);
