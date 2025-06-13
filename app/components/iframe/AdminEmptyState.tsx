"use client";

import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";

export function AdminEmptyState() {
  const theme = useTheme();
  const router = useRouter();

  const handleAddUrls = () => {
    router.push("/admin/urls");
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
        p: 3,
      }}
    >
      <Typography variant="h5" color="text.primary" gutterBottom align="center">
        Welcome to the Dashboard
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 600, textAlign: "center" }}
      >
        No URLs or URL groups have been configured yet. As an administrator, you need to add some
        URLs before users can access content.
      </Typography>

      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddUrls}
        size="large"
      >
        Add URLs
      </Button>
    </Box>
  );
}
