'use client';

import { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import Image from 'next/image';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 100KB)
    if (file.size > 100 * 1024) {
      onUploadError('File too large (max 100KB)');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      onUploadError('File must be an image');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('favicon', file);

      const response = await fetch('/api/admin/app-config/favicon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload favicon');
      }

      const data = await response.json();
      onUploadSuccess(data.favicon);
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : 'Failed to upload favicon');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setUploading(true);

      const response = await fetch('/api/admin/app-config/favicon', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete favicon');
      }

      onDelete();
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : 'Failed to delete favicon');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      {faviconUrl ? (
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              position: 'relative',
              width: 32,
              height: 32,
              margin: '0 auto',
              mb: 1,
            }}
          >
            <Image
              src={faviconUrl}
              alt="Favicon"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
            />
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={uploading}
          >
            Remove Favicon
          </Button>
        </Box>
      ) : (
        <Box>
          <input
            accept="image/*"
            style={{ display: 'none' }}
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
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Upload a 32x32 pixel image for the browser favicon
      </Typography>
    </Box>
  );
}
