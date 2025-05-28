"use client";

import { Box, Container, Paper, Typography } from "@mui/material";
import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={2}
        sx={{
          p: 4,
          borderRadius: 2,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            User Settings
          </Typography>
        </Box>
        {children}
      </Paper>
    </Container>
  );
}
