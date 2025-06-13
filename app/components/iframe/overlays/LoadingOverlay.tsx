"use client";

import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

/**
 * Overlay component that displays a loading spinner when an iframe is loading content
 */
export function LoadingOverlay({ message = "Loading content...", isVisible }: LoadingOverlayProps) {
  const theme = useTheme();
  const [appLogo, setAppLogo] = useState<string | null>(null);

  // Fetch the app logo when the component mounts
  useEffect(() => {
    // Only fetch if the overlay is visible
    if (!isVisible) return;

    async function fetchAppConfig() {
      try {
        const response = await fetch("/api/admin/app-config", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add cache control to prevent unnecessary refetches
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.appLogo) {
            setAppLogo(data.appLogo);
          }
        }
      } catch (error) {
        console.error("Error fetching app logo:", error);
      }
    }

    fetchAppConfig();
  }, [isVisible]);

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
      {/* App Logo */}
      {appLogo && (
        <Box
          sx={{
            position: "relative",
            width: 120,
            height: 120,
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={appLogo}
            alt="App Logo"
            width={120}
            height={120}
            style={{
              objectFit: "contain",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            priority
          />
        </Box>
      )}

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
