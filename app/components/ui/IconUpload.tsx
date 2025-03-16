'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Box, Avatar, IconButton, CircularProgress, Typography, Tooltip } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';

interface IconUploadProps {
  size?: number;
  iconUrl?: string | null;
  onUploadSuccess?: (iconUrl: string) => void;
  onUploadError?: (error: string) => void;
  onDelete?: () => void;
}

export default function IconUpload({
  size = 60,
  iconUrl,
  onUploadSuccess,
  onUploadError,
  onDelete
}: IconUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select an image file';
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      const errorMsg = 'Image size must be less than 1MB';
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
      return;
    }

    // Upload the image
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('icon', file);

      const response = await fetch('/api/admin/icons', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload icon');
      }

      const data = await response.json();

      if (onUploadSuccess) {
        onUploadSuccess(data.iconUrl);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload icon';
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setIsUploading(false);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle icon deletion
  const handleDeleteIcon = async () => {
    if (!iconUrl || !onDelete) return;

    setIsUploading(true);
    setError(null);

    try {
      // Let the parent component handle actual deletion
      onDelete();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete icon';
      setError(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle click on icon (open file dialog)
  const handleIconClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Icon Avatar */}
      <Avatar
        src={iconUrl || undefined}
        alt="URL Icon"
        sx={{
          width: size,
          height: size,
          cursor: 'pointer',
          fontSize: size / 2,
          bgcolor: 'primary.light'
        }}
        onClick={handleIconClick}
      >
        {!iconUrl && <ImageIcon />}
      </Avatar>

      {/* Upload buttons */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -8,
          right: -8,
          display: 'flex',
          gap: 0.5
        }}
      >
        <Tooltip title="Upload icon">
          <IconButton
            size="small"
            color="primary"
            onClick={handleIconClick}
            disabled={isUploading}
            sx={{
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.default' }
            }}
          >
            <PhotoCameraIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {iconUrl && (
          <Tooltip title="Remove icon">
            <IconButton
              size="small"
              color="error"
              onClick={handleDeleteIcon}
              disabled={isUploading}
              sx={{
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'background.default' }
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
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '50%'
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
            display: 'block',
            textAlign: 'center',
            mt: 1,
            maxWidth: size * 2
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
