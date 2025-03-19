"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Box, Avatar, IconButton, CircularProgress, Typography, Tooltip } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAuth } from "@/app/lib/auth/auth-context";

interface AvatarUploadProps {
  size?: number;
  editable?: boolean;
  onUploadSuccess?: (avatarUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export default function AvatarUpload({
  size = 100,
  editable = true,
  onUploadSuccess,
  onUploadError,
}: AvatarUploadProps) {
  const { user, updateUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user initials for fallback avatar
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : "?";

  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const errorMsg = "Please select an image file";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      const errorMsg = "Image size must be less than 2MB";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Upload the image
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      const data = await response.json();

      // Update user with new avatar URL
      if (updateUser && data.avatarUrl && user) {
        updateUser({
          ...user,
          avatarUrl: data.avatarUrl,
        });
      }

      if (onUploadSuccess) {
        onUploadSuccess(data.avatarUrl);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload avatar";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setIsUploading(false);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle avatar deletion
  const handleDeleteAvatar = async () => {
    if (!user?.avatarUrl) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete avatar");
      }

      // Update user with null avatar URL
      if (updateUser && user) {
        updateUser({
          ...user,
          avatarUrl: undefined,
        });
      }

      if (onUploadSuccess) {
        onUploadSuccess("");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete avatar";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle click on avatar (open file dialog)
  const handleAvatarClick = () => {
    if (editable && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Avatar */}
      <Avatar
        src={user?.avatarUrl || undefined}
        alt={user?.username || "User"}
        sx={{
          width: size,
          height: size,
          cursor: editable ? "pointer" : "default",
          fontSize: size / 2,
          bgcolor: "primary.main",
        }}
        onClick={handleAvatarClick}
      >
        {!user?.avatarUrl && initials}
      </Avatar>

      {/* Upload overlay (when editable) */}
      {editable && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            display: "flex",
            gap: 0.5,
          }}
        >
          <Tooltip title="Upload new avatar">
            <IconButton
              size="small"
              color="primary"
              onClick={handleAvatarClick}
              disabled={isUploading}
              sx={{
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "background.default" },
              }}
            >
              <PhotoCameraIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {user?.avatarUrl && (
            <Tooltip title="Remove avatar">
              <IconButton
                size="small"
                color="error"
                onClick={handleDeleteAvatar}
                disabled={isUploading}
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.default" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Loading overlay */}
      {isUploading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0, 0, 0, 0.3)",
            borderRadius: "50%",
          }}
        >
          <CircularProgress size={size / 3} />
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 1,
            maxWidth: size * 2,
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
