"use client";

import { Box, Typography, Button, useTheme } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

interface UnloadedOverlayProps {
  message?: string;
  isVisible: boolean;
  onReload: () => void;
}

/**
 * Overlay component that displays when an iframe is unloaded, with a reload button
 */
export function UnloadedOverlay({
  message = "Content is unloaded to save resources",
  isVisible,
  onReload,
}: UnloadedOverlayProps) {
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
        backgroundColor: `rgba(${theme.palette.mode === "dark" ? "0, 0, 0, 0.6" : "255, 255, 255, 0.8"})`,
        zIndex: 10,
        backdropFilter: "blur(2px)",
        p: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: 450,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          padding: 3,
          boxShadow: 1,
        }}
      >
        <PlayCircleOutlineIcon
          color="primary"
          sx={{
            fontSize: 60,
            mb: 2,
            opacity: 0.8,
          }}
        />

        <Typography
          variant="h6"
          sx={{
            mb: 2,
            textAlign: "center",
            fontWeight: "medium",
            color:
              theme.palette.mode === "dark" ? theme.palette.grey[300] : theme.palette.grey[700],
          }}
        >
          {message}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={onReload}
          sx={{
            mt: 1,
            fontWeight: "medium",
            minWidth: 150,
          }}
        >
          Load Content
        </Button>
      </Box>
    </Box>
  );
}
