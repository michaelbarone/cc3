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
    }
  };

  return (
    <Card sx={{ mt: 4, width: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Restore from Backup
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          You can restore from a previous backup during first run setup.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
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
            disabled={isLoading}
          >
            Restore from Backup
          </Button>
        </Box>

        {/* Progress Indicator */}
        {isLoading && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Restoring backup...
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
