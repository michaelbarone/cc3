"use client";

import AvatarUpload from "@/app/components/ui/AvatarUpload";
import { useAuth } from "@/app/lib/auth/auth-context";
import { Alert, Box, Divider, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Handle avatar upload success
  const handleAvatarSuccess = () => {
    setNotification({
      open: true,
      message: "Avatar updated successfully",
      severity: "success",
    });
  };

  // Handle avatar upload error
  const handleAvatarError = (error: string) => {
    setNotification({
      open: true,
      message: `Avatar update failed: ${error}`,
      severity: "error",
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Profile Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your profile information and avatar
      </Typography>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          Profile Picture
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            gap: 4,
            mb: 4,
          }}
        >
          <AvatarUpload
            size={150}
            onUploadSuccess={handleAvatarSuccess}
            onUploadError={handleAvatarError}
          />

          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" gutterBottom>
              Upload a profile picture to personalize your account.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your profile picture will be visible to other users. Recommended image size: 250x250
              pixels. Maximum file size: 2MB.
            </Typography>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Stack spacing={3}>
          <TextField
            label="Username"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            disabled
            helperText="Your username cannot be changed"
          />

          <TextField
            label="Role"
            value={user?.isAdmin ? "Admin" : "User"}
            fullWidth
            disabled
            helperText="Contact an administrator to change your role"
          />
        </Stack>
      </Paper>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
