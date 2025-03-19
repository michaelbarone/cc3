"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Box, IconButton, CircularProgress, Typography, Tooltip, Paper } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";

interface LogoUploadProps {
  logoUrl?: string | null;
  onUploadSuccess?: (logoUrl: string) => void;
  onUploadError?: (error: string) => void;
  onDelete?: () => void;
}

export default function LogoUpload({
  logoUrl,
  onUploadSuccess,
  onUploadError,
  onDelete,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      const errorMsg = "Image size must be less than 1MB";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Upload the image
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/admin/app-config/logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();

      if (onUploadSuccess) {
        onUploadSuccess(data.appLogo);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload logo";
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

  // Handle logo deletion
  const handleDeleteLogo = async () => {
    if (!logoUrl || !onDelete) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/app-config/logo", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete logo");
      }

      onDelete();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete logo";
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle click on logo area (open file dialog)
  const handleLogoClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: 300 }}>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Logo display area */}
      <Paper
        sx={{
          width: "100%",
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
          bgcolor: "background.default",
          border: "1px dashed",
          borderColor: "divider",
          p: 2,
        }}
        onClick={handleLogoClick}
      >
        {logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt="App Logo"
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <Box
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.7 }}
          >
            <ImageIcon sx={{ fontSize: 40 }} />
            <Typography variant="caption" sx={{ mt: 1 }}>
              Click to upload logo
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Upload buttons */}
      <Box
        sx={{
          position: "absolute",
          bottom: -8,
          right: -8,
          display: "flex",
          gap: 0.5,
        }}
      >
        <Tooltip title="Upload logo">
          <IconButton
            size="small"
            color="primary"
            onClick={handleLogoClick}
            disabled={isUploading}
            sx={{
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "background.default" },
            }}
          >
            <PhotoCameraIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {logoUrl && (
          <Tooltip title="Remove logo">
            <IconButton
              size="small"
              color="error"
              onClick={handleDeleteLogo}
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
          }}
        >
          <CircularProgress size={40} />
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
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
