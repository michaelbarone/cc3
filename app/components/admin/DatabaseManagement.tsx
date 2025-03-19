"use client";

import DownloadIcon from "@mui/icons-material/Download";
import RestoreIcon from "@mui/icons-material/Restore";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import React, { useRef, useState } from "react";

interface BackupState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
}

export default function DatabaseManagement() {
  const [backupState, setBackupState] = useState<BackupState>({
    isLoading: false,
    progress: 0,
    error: null,
    success: null,
  });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle backup creation and download
  const handleCreateBackup = async () => {
    try {
      setBackupState({
        isLoading: true,
        progress: 0,
        error: null,
        success: null,
      });

      const response = await fetch("/api/admin/backup", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to create backup");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : "backup.zip";

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setBackupState((prev) => ({
        ...prev,
        isLoading: false,
        success: "Backup created and downloaded successfully",
      }));
    } catch (error) {
      setBackupState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create backup",
      }));
    }
  };

  // Handle file selection for restore
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowRestoreConfirm(true);
    }
  };

  // Handle restore confirmation
  const handleRestoreConfirm = async () => {
    if (!selectedFile) return;

    try {
      setBackupState({
        isLoading: true,
        progress: 0,
        error: null,
        success: null,
      });

      const formData = new FormData();
      formData.append("backup", selectedFile);

      const response = await fetch("/api/admin/backup", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore backup");
      }

      setBackupState((prev) => ({
        ...prev,
        isLoading: false,
        success: "Backup restored successfully",
      }));
    } catch (error) {
      setBackupState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to restore backup",
      }));
    } finally {
      setShowRestoreConfirm(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Database Management
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Backup and Restore
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create a backup of the database and all uploaded files, or restore from a previous backup.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleCreateBackup}
            disabled={backupState.isLoading}
          >
            Create Backup
          </Button>

          <input
            type="file"
            accept=".zip"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={backupState.isLoading}
          >
            Restore from Backup
          </Button>
        </Box>

        {/* Progress and Status */}
        {backupState.isLoading && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress variant="indeterminate" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {backupState.progress > 0
                ? `Progress: ${Math.round(backupState.progress)}%`
                : "Processing..."}
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {backupState.success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Success</AlertTitle>
            {backupState.success}
          </Alert>
        )}

        {/* Error Message */}
        {backupState.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {backupState.error}
          </Alert>
        )}
      </Box>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onClose={() => setShowRestoreConfirm(false)}>
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to restore from this backup? This will replace your current
            database and uploaded files. A backup of your current state will be created before
            proceeding.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreConfirm(false)}>Cancel</Button>
          <Button onClick={handleRestoreConfirm} color="primary" variant="contained">
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
