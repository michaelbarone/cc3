"use client";

import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

/**
 * Overlay component that displays a loading spinner when an iframe is loading content
 */
export function LoadingOverlay({ message = "Loading content...", isVisible }: LoadingOverlayProps) {
  const theme = useTheme();

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `rgba(${theme.palette.mode === "dark" ? "0, 0, 0, 0.7" : "255, 255, 255, 0.7"})`,
        zIndex: 10,
        backdropFilter: "blur(2px)",
        transition: "opacity 0.3s ease-in-out",
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mt: 2,
          fontWeight: "medium",
          textAlign: "center",
          maxWidth: "80%",
          padding: 2,
          borderRadius: 1,
          backgroundColor: `rgba(${theme.palette.mode === "dark" ? "0, 0, 0, 0.4" : "255, 255, 255, 0.4"})`,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
