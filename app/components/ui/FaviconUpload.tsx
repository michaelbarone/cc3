"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Image from "next/image";
import React, { useState } from "react";

interface FaviconUploadProps {
  faviconUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  onDelete: () => void;
}

export default function FaviconUpload({
  faviconUrl,
  onUploadSuccess,
  onUploadError,
  onDelete,
}: FaviconUploadProps) {
  const [uploading, setUploading] = useState(false);
  // Default favicon URL
  const defaultFaviconUrl = "/favicon-default.png";

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 100KB)
    if (file.size > 100 * 1024) {
      onUploadError("File too large (max 100KB)");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      onUploadError("File must be an image");
      return;
    }

    try {
      setUploading(true);
      console.log("Uploading file:", file.name, "Type:", file.type, "Size:", file.size);

      const formData = new FormData();
      formData.append("favicon", file);

      const response = await fetch("/api/admin/app-config/favicon", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Upload error response:", data);
        throw new Error(data.error || "Failed to upload favicon");
      }

      const data = await response.json();
      onUploadSuccess(data.favicon);
    } catch (error) {
      console.error("Upload error:", error);
      onUploadError(error instanceof Error ? error.message : "Failed to upload favicon");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setUploading(true);

      const response = await fetch("/api/admin/app-config/favicon", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete favicon");
      }

      onDelete();
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : "Failed to delete favicon");
    } finally {
      setUploading(false);
    }
  };

  // Check if we have a custom favicon or should use the default
  const displayFaviconUrl = faviconUrl || defaultFaviconUrl;
  const isUsingDefault = !faviconUrl && displayFaviconUrl === defaultFaviconUrl;

  return (
    <Box sx={{ textAlign: "center" }}>
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            position: "relative",
            width: 32,
            height: 32,
            margin: "0 auto",
            mb: 1,
          }}
        >
          <Image
            src={displayFaviconUrl}
            alt="Favicon"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        </Box>

        {faviconUrl ? (
          // Custom favicon is set, show delete button
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={uploading}
          >
            Remove Favicon
          </Button>
        ) : (
          // No custom favicon, show upload button
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              {isUsingDefault ? "Using default favicon" : "No favicon set"}
            </Typography>
            <input
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              style={{ display: "none" }}
              id="favicon-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="favicon-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                disabled={uploading}
              >
                Upload Favicon
              </Button>
            </label>
          </>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Upload a 32x32 pixel image for the browser favicon. Supported formats: PNG, JPEG, GIF, WebP,
        SVG
      </Typography>
    </Box>
  );
}
