"use client";

import { UserPreferencesSection } from "@/app/components/settings/UserPreferencesSection";
import { getUserInitials } from "@/app/utils/userUtils";
import { Box, Container, Divider, Paper, Typography } from "@mui/material";
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

export default function ProfileSettingsPage() {
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Profile Information Section (placeholder) */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your profile information will be displayed here in future updates.
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* User Preferences Section */}
        <UserPreferencesSection />
      </Paper>
    </Container>
  );
}
