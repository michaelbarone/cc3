"use client";

import { Box, Paper, Typography } from "@mui/material";
import { useSession } from "next-auth/react";

export default function AdminDashboardPage() {
  const { data: session } = useSession();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        ControlCenter Administration
      </Typography>

      <Paper
        elevation={2}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Welcome, {session?.user?.name || "Administrator"}
        </Typography>
        <Typography variant="body1" paragraph>
          This is the administrator dashboard for ControlCenter. Use the navigation menu on the left
          to access different administrative features.
        </Typography>
        <Typography variant="body1">
          From here, you can manage users, URL groups, global URLs, application branding, system
          settings, and view system statistics and activity logs.
        </Typography>
      </Paper>
    </Box>
  );
}
