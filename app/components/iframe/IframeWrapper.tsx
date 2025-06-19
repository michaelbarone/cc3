"use client";

import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
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
  isLocalhost?: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePort?: string | null;
  localhostMobilePath?: string | null;
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
 * - Localhost URL generation
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
      sandbox = "allow-same-origin allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation allow-top-navigation-by-user-activation",
      title = `iframe-${id}`,
      isLocalhost = false,
      port = null,
      path = null,
      localhostMobilePort = null,
      localhostMobilePath = null,
      onLoad,
      onError,
      onReload,
    },
    ref,
  ) {
    const isMobile = useMediaQuery("(max-width:600px)");
    const [showIframe, setShowIframe] = useState(isActive);

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

    // Create an object that matches the UrlWithLocalhost interface
    const urlWithLocalhost = {
      id,
      url,
      urlMobile,
      isLocalhost,
      port,
      path,
      localhostMobilePath,
      localhostMobilePort,
    };

    // Get the effective URL using the shared function
    let effectiveUrl = getEffectiveUrl(urlWithLocalhost, isMobile);

    // Make sure we have a non-empty effectiveUrl, particularly important for localhost URLs
    if (!effectiveUrl && isLocalhost) {
      // Force regeneration of localhost URL even when URL is empty
      const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const effectivePort = isMobile && localhostMobilePort ? localhostMobilePort : port || "";
      const effectivePath = isMobile && localhostMobilePath ? localhostMobilePath : path || "/";

      // Build a fallback URL
      effectiveUrl = effectivePort
        ? `${protocol}//${hostname}:${effectivePort}${effectivePath}`
        : `${protocol}//${hostname}${effectivePath}`;
    }

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
          src={isUnloaded ? "" : effectiveUrl}
          data-url-id={id}
          data-src={effectiveUrl}
          data-url={effectiveUrl}
          data-is-localhost={isLocalhost ? "true" : "false"}
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
