"use client";

import { Box, Typography, Button, Alert, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface ErrorOverlayProps {
  message?: string;
  error?: string | null;
  isVisible: boolean;
  onRetry: () => void;
}

/**
 * Overlay component that displays an error message and retry button when an iframe fails to load
 */
export function ErrorOverlay({
  message = "Failed to load content",
  error = null,
  isVisible,
  onRetry,
}: ErrorOverlayProps) {
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
        backgroundColor: `rgba(${theme.palette.mode === "dark" ? "0, 0, 0, 0.7" : "255, 255, 255, 0.8"})`,
        zIndex: 10,
        backdropFilter: "blur(3px)",
        padding: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: 500,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          padding: 3,
          boxShadow: theme.shadows[3],
        }}
      >
        <ErrorOutlineIcon
          color="error"
          sx={{
            fontSize: 60,
            mb: 2,
            opacity: 0.8,
          }}
        />

        <Typography
          variant="h6"
          color="error"
          sx={{
            mb: 1,
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {message}
        </Typography>

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              width: "100%",
              mb: 3,
              mt: 1,
              wordBreak: "break-word",
            }}
          >
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{
            mt: 1,
            fontWeight: "medium",
            minWidth: 150,
          }}
        >
          Try Again
        </Button>
      </Box>
    </Box>
  );
}
