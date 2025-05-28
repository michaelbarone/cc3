"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Snackbar,
  Switch,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [allowUserCreation, setAllowUserCreation] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Fetch current settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();

      // Parse the string value to boolean
      setAllowUserCreation(data.settings?.allowAdminUserCreation !== "false");
    } catch (error) {
      console.error("Error fetching settings:", error);
      showSnackbar("Error loading settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserCreation = () => {
    // Store the pending change and show confirmation dialog
    setPendingChange(!allowUserCreation);
    setConfirmDialogOpen(true);
  };

  const confirmSettingChange = async () => {
    if (pendingChange === null) return;

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowAdminUserCreation: pendingChange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update setting");
      }

      // Apply the change
      setAllowUserCreation(pendingChange);
      showSnackbar("Setting updated successfully", "success");
    } catch (error) {
      console.error("Error updating setting:", error);
      showSnackbar(error instanceof Error ? error.message : "Failed to update setting", "error");
    } finally {
      setConfirmDialogOpen(false);
      setPendingChange(null);
    }
  };

  const cancelSettingChange = () => {
    setConfirmDialogOpen(false);
    setPendingChange(null);
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Application Settings
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Management Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowUserCreation}
                    onChange={handleToggleUserCreation}
                    color="primary"
                  />
                }
                label="Allow New User Creation by Admins"
              />
            </FormGroup>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              When enabled, administrators can create new user accounts. When disabled, no new users
              can be created, even by administrators.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={cancelSettingChange}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {pendingChange ? "Enable User Creation?" : "Disable User Creation?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {pendingChange
              ? "This will allow administrators to create new user accounts. Are you sure you want to enable this feature?"
              : "This will prevent administrators from creating new user accounts. Are you sure you want to disable this feature?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelSettingChange} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={confirmSettingChange}
            color={pendingChange ? "primary" : "warning"}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
