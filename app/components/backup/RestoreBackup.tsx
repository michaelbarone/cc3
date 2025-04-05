"use client";

import { Restore as RestoreIcon } from "@mui/icons-material";
import { Alert, Box, Button, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import React, { useRef, useState } from "react";

interface RestoreBackupProps {
  onRestoreComplete: () => void;
}

// testtest
export default function RestoreBackup({
  onRestoreComplete,
}: RestoreBackupProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard trigger for file selection
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Handle keyboard accessibility for alerts
  const handleAlertKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
      event.preventDefault();
      setError(null);
      setSuccess(null);
      // Return focus to the restore button
      restoreButtonRef.current?.focus();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      setError("Invalid file type. Please upload a .zip file");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("backup", file);

      const response = await fetch("/api/first-run/restore", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore backup");
      }

      setSuccess("Backup restored successfully");
      onRestoreComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to restore backup");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Return focus to the restore button when file operations complete
      restoreButtonRef.current?.focus();
    }
  };

  return (
    <Card
      sx={{ mt: 4, pb: 0, width: "100%", maxWidth: "350px", mx: "auto" }}
      role="region"
      aria-label="Restore from backup"
    >
      <CardContent sx={{ pb: "0 !important", textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Restore from Backup
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          You can restore from a previous app backup.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3, justifyContent: "center" }}>
          <input
            type="file"
            accept=".zip"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileSelect}
            aria-hidden="true"
            tabIndex={-1}
          />
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleKeyDown}
            ref={restoreButtonRef}
            disabled={isLoading}
            aria-label="Select a backup file to restore"
          >
            Restore from Backup
          </Button>
        </Box>

        {/* Progress Indicator */}
        {isLoading && (
          <Box sx={{ width: "100%", mt: 2, textAlign: "center" }} role="status" aria-live="polite">
            <LinearProgress aria-label="Restoring backup in progress" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Restoring backup...
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Alert
            severity="success"
            sx={{ mt: 2, display: "flex", justifyContent: "center" }}
            onKeyDown={handleAlertKeyDown}
            tabIndex={0}
            role="status"
            aria-live="polite"
          >
            {success}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2, display: "flex", justifyContent: "center" }}
            onKeyDown={handleAlertKeyDown}
            tabIndex={0}
            role="alert"
            aria-live="assertive"
          >
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
