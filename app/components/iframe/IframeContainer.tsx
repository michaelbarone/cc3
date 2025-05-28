"use client";

import { useIframeManager } from "@/app/contexts/IframeProvider";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useState } from "react";

interface IframeContainerProps {
  /** Iframe container height */
  height?: string | number;
}

/**
 * Container component for rendering iframes managed by the IframeProvider
 */
export default function IframeContainer({ height = "100%" }: IframeContainerProps) {
  const { getAllManagedIframesForRender, markAsLoaded, setActiveUrl, activeUrlIdentifier } =
    useIframeManager();
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());
  const theme = useTheme();

  // Get all iframes to render
  const iframesToRender = getAllManagedIframesForRender();

  // Find the active iframe data
  const activeIframeData = iframesToRender.find((iframe) => iframe.isActive);

  // Handle iframe load error
  const handleIframeError = (id: string) => {
    const newErrors = new Set(loadErrors);
    newErrors.add(id);
    setLoadErrors(newErrors);
  };

  // Handle iframe load success
  const handleIframeLoad = (id: string) => {
    markAsLoaded(id);
    // Remove from error set if it was there
    if (loadErrors.has(id)) {
      const newErrors = new Set(loadErrors);
      newErrors.delete(id);
      setLoadErrors(newErrors);
    }
  };

  // Handle reload of unloaded content
  const handleReloadContent = (id: string, src: string) => {
    setActiveUrl(id, src);
  };

  // Show content unloaded message for active but unloaded URL
  if (activeIframeData && !activeIframeData.isLoaded) {
    return (
      <Box
        sx={{
          height,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Content Unloaded
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => handleReloadContent(activeIframeData.identifier, activeIframeData.dataSrc)}
          sx={{ mt: 2 }}
        >
          Reload Content
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height,
        width: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Render each iframe */}
      {iframesToRender.map((iframe) => (
        <Box
          key={iframe.identifier}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            visibility: iframe.isActive ? "visible" : "hidden",
            zIndex: iframe.isActive ? 1 : 0,
            ...(iframe.isActive === false && {
              position: "absolute",
              left: "-9999px",
            }),
          }}
        >
          <iframe
            src={iframe.srcToRender}
            data-src={iframe.dataSrc}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
            title={iframe.identifier}
            onLoad={() => handleIframeLoad(iframe.identifier)}
            onError={() => handleIframeError(iframe.identifier)}
          />
        </Box>
      ))}

      {/* Show error message for active iframe load failures */}
      {activeUrlIdentifier && loadErrors.has(activeUrlIdentifier) && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.palette.background.default,
            zIndex: 2,
          }}
        >
          <Typography variant="h6" color="error">
            Failed to load content
          </Typography>
        </Box>
      )}
    </Box>
  );
}
