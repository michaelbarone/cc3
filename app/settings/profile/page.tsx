"use client";

import { getUserInitials } from "@/app/utils/userUtils";
import { PhotoCamera } from "@mui/icons-material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useSession } from "next-auth/react";
import React, { useRef, useState } from "react";

// Define extended session user type
type ExtendedUser = {
  id: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  theme: string;
  menuPosition: string;
  passwordHash?: string;
  avatarUrl?: string | null;
};

// Define password validation functions
const validatePassword = (password: string) => {
  return password.length >= 4; // MVP requirement is min 4 chars
};

// Generate a background color based on username hash
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const username = session?.user?.name || "";

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (session?.user as ExtendedUser)?.avatarUrl || null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Handle password validation and submission
  const handlePasswordSubmit = async () => {
    // Reset errors
    setPasswordError("");

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (!validatePassword(newPassword)) {
      setPasswordError("Password must be at least 4 characters long");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch("/api/user/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined, // Only send if not empty
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to change password");
      }

      // Success - clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setNotification({
        open: true,
        message: "Password changed successfully",
        severity: "success",
      });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle file selection for avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleAvatarFile(file);
  };

  // Process avatar file
  const handleAvatarFile = (file?: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setNotification({
        open: true,
        message: "Invalid file type. Please upload JPG, PNG, or GIF.",
        severity: "error",
      });
      return;
    }

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      setNotification({
        open: true,
        message: "File too large. Maximum size is 1MB.",
        severity: "error",
      });
      return;
    }

    // Set file and create preview
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleAvatarFile(file);
  };

  // Upload avatar
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setAvatarLoading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const response = await fetch("/api/user/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload avatar");
      }

      const data = await response.json();

      // Update avatar URL
      setAvatarUrl(data.avatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);

      // Update session with new avatar URL
      updateSession({ user: { avatarUrl: data.avatarUrl } });

      setNotification({
        open: true,
        message: "Avatar uploaded successfully",
        severity: "success",
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : "Failed to upload avatar",
        severity: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);

    try {
      const response = await fetch("/api/user/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove avatar");
      }

      // Clear avatar
      setAvatarUrl(null);
      setAvatarPreview(null);
      setAvatarFile(null);

      // Update session
      updateSession({ user: { avatarUrl: null } });

      setNotification({
        open: true,
        message: "Avatar removed successfully",
        severity: "success",
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : "Failed to remove avatar",
        severity: "error",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Get avatar display source
  const avatarDisplaySrc = avatarPreview || avatarUrl;

  // Calculate avatar fallback (initials)
  const userInitials = getUserInitials(username);
  const bgColor = stringToColor(username);

  return (
    <Box>
      {/* Profile Information Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Profile Information
        </Typography>
        <TextField fullWidth label="Username" value={username} disabled sx={{ mb: 2 }} />
        <FormHelperText>Your username cannot be changed</FormHelperText>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Password Change Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Change Password
        </Typography>

        {(session?.user as ExtendedUser)?.passwordHash && (
          <TextField
            fullWidth
            label="Current Password"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        <TextField
          fullWidth
          label="New Password"
          type={showNewPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  edge="end"
                >
                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm New Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          error={!!passwordError}
          helperText={passwordError}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handlePasswordSubmit}
          disabled={passwordLoading || (!newPassword && !confirmPassword)}
          sx={{ mt: 2 }}
        >
          {passwordLoading ? <CircularProgress size={24} /> : "Change Password"}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Avatar Management Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Avatar Management
        </Typography>

        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Avatar
              src={avatarDisplaySrc || undefined}
              alt={username}
              sx={{
                width: 100,
                height: 100,
                fontSize: 40,
                bgcolor: !avatarDisplaySrc ? bgColor : undefined,
              }}
            >
              {!avatarDisplaySrc && userInitials}
            </Avatar>
          </Grid>

          <Grid item xs>
            <Box
              sx={{
                border: 2,
                borderRadius: 1,
                borderColor: isDragging ? "primary.main" : "divider",
                borderStyle: "dashed",
                p: 3,
                textAlign: "center",
                mb: 2,
                bgcolor: isDragging ? "action.hover" : "transparent",
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <Typography variant="body1" gutterBottom>
                Drag & drop an image here, or
              </Typography>

              <Button
                variant="contained"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mt: 1 }}
              >
                Select File
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                JPG, PNG, or GIF. Max size: 1MB
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                disabled={!avatarFile || avatarLoading}
                onClick={handleAvatarUpload}
              >
                {avatarLoading ? <CircularProgress size={24} /> : "Upload Avatar"}
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={!avatarUrl || avatarLoading}
                onClick={handleRemoveAvatar}
              >
                Remove Avatar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
