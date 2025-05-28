"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Typography, useTheme } from "@mui/material";

interface UnloadedContentProps {
  urlId: string;
  onReload: (urlId: string) => void;
}

export function UnloadedContent({ urlId, onReload }: UnloadedContentProps) {
  const theme = useTheme();

  const handleReload = () => {
    onReload(urlId);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        bgcolor: theme.palette.background.default,
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Content Unloaded
      </Typography>

      <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReload} sx={{ mt: 2 }}>
        Reload Content
      </Button>
    </Box>
  );
}
