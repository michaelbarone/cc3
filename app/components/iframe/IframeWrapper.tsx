"use client";

import { Box, useMediaQuery } from "@mui/material";
import { forwardRef, useEffect, useState } from "react";
import { ErrorOverlay, LoadingOverlay, UnloadedOverlay } from "./overlays";

type IframeStatus = "active-loaded" | "active-unloaded" | "inactive-loaded" | "inactive-unloaded";

interface IframeWrapperProps {
  id: string;
  url: string;
  urlMobile: string | null;
  status: IframeStatus;
  error: string | null;
  isActive: boolean;
  sandbox?: string;
  title?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onReload?: () => void;
}

/**
 * A wrapper component for iframes that handles:
 * - Mobile/desktop URL selection
 * - Loading, error, and unloaded states
 * - Appropriate overlay rendering
 * - Ref forwarding
 */
export const IframeWrapper = forwardRef<HTMLIFrameElement, IframeWrapperProps>(
  function IframeWrapper(
    {
      id,
      url,
      urlMobile,
      status,
      error,
      isActive,
      sandbox = "allow-same-origin allow-scripts allow-forms allow-popups",
      title = `iframe-${id}`,
      onLoad,
      onError,
      onReload,
    },
    ref,
  ) {
    const isMobile = useMediaQuery("(max-width:600px)");
    const [showIframe, setShowIframe] = useState(isActive);

    // Select the appropriate URL based on device
    const selectedUrl = isMobile && urlMobile ? urlMobile : url;

    // Handle visibility changes
    useEffect(() => {
      if (isActive) {
        setShowIframe(true);
      } else {
        // When becoming inactive, wait for fade out before hiding
        const timer = setTimeout(() => {
          setShowIframe(false);
        }, 300); // Match transition duration
        return () => clearTimeout(timer);
      }
    }, [isActive]);

    const isUnloaded = status === "active-unloaded" || status === "inactive-unloaded";

    const handleReload = () => {
      if (onReload) onReload();
    };

    const handleRetry = () => {
      if (onReload) onReload();
    };

    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          visibility: showIframe ? "visible" : "hidden",
          opacity: isActive ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        <iframe
          ref={ref}
          title={title}
          sandbox={sandbox}
          src={isUnloaded ? "" : selectedUrl}
          data-url-id={id}
          data-url={selectedUrl}
          onLoad={onLoad}
          onError={() => onError?.("Failed to load iframe content")}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent",
          }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        />

        <LoadingOverlay
          isVisible={isActive && status === "active-unloaded"}
          message="Loading content..."
        />

        <ErrorOverlay isVisible={isActive && !!error} error={error} onRetry={handleRetry} />

        <UnloadedOverlay
          isVisible={isActive && status === "active-unloaded" && !error}
          onReload={handleReload}
        />
      </Box>
    );
  },
);
