"use client";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface BrandingSettings {
  appName: string;
  logoPath: string | null;
  faviconPath: string | null;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function BrandingPage() {
  // State for branding settings
  const [settings, setSettings] = useState<BrandingSettings>({
    appName: "ControlCenter",
    logoPath: null,
    faviconPath: null,
  });

  // State for form inputs
  const [appName, setAppName] = useState("");

  // State for file uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  // State for previews
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingFavicon, setLoadingFavicon] = useState(false);

  // Alert state
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: "",
    severity: "info",
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Fetch branding settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch branding settings");
      }

      const data = await response.json();

      // Process settings from the response
      const brandingSettings: BrandingSettings = {
        appName: data.settings.appName || "ControlCenter",
        logoPath: data.settings.logoPath || null,
        faviconPath: data.settings.faviconPath || null,
      };

      setSettings(brandingSettings);
      setAppName(brandingSettings.appName);

      // Clear previews if no files
      if (!logoFile) {
        setLogoPreview(brandingSettings.logoPath);
      }

      if (!faviconFile) {
        setFaviconPreview(brandingSettings.faviconPath);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      showAlert("Error fetching branding settings", "error");
    } finally {
      setLoading(false);
    }
  }, [logoFile, faviconFile]);

  // Show alert helper
  const showAlert = (message: string, severity: AlertState["severity"]) => {
    setAlert({
      open: true,
      message,
      severity,
    });
  };

  // Handle logo dropzone
  const onDropLogo = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        showAlert("Invalid file type. Please upload a JPG, PNG, or SVG file.", "error");
        return;
      }

      // Validate file size (1MB)
      if (file.size > 1024 * 1024) {
        showAlert("File is too large. Maximum size is 1MB.", "error");
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle favicon dropzone
  const onDropFavicon = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Validate file type
      const validTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
      if (!validTypes.includes(file.type)) {
        showAlert("Invalid file type. Please upload a PNG or ICO file.", "error");
        return;
      }

      // Validate file size (100KB)
      if (file.size > 100 * 1024) {
        showAlert("File is too large. Maximum size is 100KB.", "error");
        return;
      }

      setFaviconFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Setup dropzones
  const logoDropzone = useDropzone({
    onDrop: onDropLogo,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/svg+xml": [".svg"],
    },
    maxFiles: 1,
  });

  const faviconDropzone = useDropzone({
    onDrop: onDropFavicon,
    accept: {
      "image/png": [".png"],
      "image/x-icon": [".ico"],
      "image/vnd.microsoft.icon": [".ico"],
    },
    maxFiles: 1,
  });

  // Handle app name save
  const handleSaveAppName = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Update Application Name",
      message: `Are you sure you want to update the application name to "${appName}"?`,
      onConfirm: saveAppName,
    });
  };

  // Save app name
  const saveAppName = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update application name");
      }

      showAlert("Application name updated successfully", "success");
      fetchSettings();
    } catch (error) {
      console.error("Error updating app name:", error);
      showAlert("Error updating application name", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleUploadLogo = () => {
    if (!logoFile) {
      showAlert("Please select a logo file", "error");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Upload Logo",
      message: "Are you sure you want to upload this logo? This will replace the current logo.",
      onConfirm: uploadLogo,
    });
  };

  // Upload logo
  const uploadLogo = async () => {
    if (!logoFile) return;

    try {
      setLoadingLogo(true);

      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("fileType", "logo");

      const response = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      showAlert("Logo uploaded successfully", "success");
      setLogoFile(null);
      fetchSettings();
    } catch (error) {
      console.error("Error uploading logo:", error);
      showAlert("Error uploading logo", "error");
    } finally {
      setLoadingLogo(false);
    }
  };

  // Handle favicon upload
  const handleUploadFavicon = () => {
    if (!faviconFile) {
      showAlert("Please select a favicon file", "error");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Upload Favicon",
      message:
        "Are you sure you want to upload this favicon? This will replace the current favicon.",
      onConfirm: uploadFavicon,
    });
  };

  // Upload favicon
  const uploadFavicon = async () => {
    if (!faviconFile) return;

    try {
      setLoadingFavicon(true);

      const formData = new FormData();
      formData.append("file", faviconFile);
      formData.append("fileType", "favicon");

      const response = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload favicon");
      }

      showAlert("Favicon uploaded successfully", "success");
      setFaviconFile(null);
      fetchSettings();
    } catch (error) {
      console.error("Error uploading favicon:", error);
      showAlert("Error uploading favicon", "error");
    } finally {
      setLoadingFavicon(false);
    }
  };

  // Handle logo delete
  const handleDeleteLogo = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Remove Custom Logo",
      message:
        "Are you sure you want to remove the custom logo? This will revert to the default logo.",
      onConfirm: deleteLogo,
    });
  };

  // Delete logo
  const deleteLogo = async () => {
    try {
      setLoadingLogo(true);

      const response = await fetch("/api/admin/branding/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "logo",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete logo");
      }

      showAlert("Logo removed successfully", "success");
      setLogoFile(null);
      setLogoPreview(null);
      fetchSettings();
    } catch (error) {
      console.error("Error deleting logo:", error);
      showAlert("Error removing logo", "error");
    } finally {
      setLoadingLogo(false);
    }
  };

  // Handle favicon delete
  const handleDeleteFavicon = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Remove Custom Favicon",
      message:
        "Are you sure you want to remove the custom favicon? This will revert to the default favicon.",
      onConfirm: deleteFavicon,
    });
  };

  // Delete favicon
  const deleteFavicon = async () => {
    try {
      setLoadingFavicon(true);

      const response = await fetch("/api/admin/branding/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "favicon",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete favicon");
      }

      showAlert("Favicon removed successfully", "success");
      setFaviconFile(null);
      setFaviconPreview(null);
      fetchSettings();
    } catch (error) {
      console.error("Error deleting favicon:", error);
      showAlert("Error removing favicon", "error");
    } finally {
      setLoadingFavicon(false);
    }
  };

  // Handle alert close
  const handleAlertClose = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  // Handle confirmation dialog close
  const handleConfirmDialogClose = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Application Branding
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {/* App Name Section */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Application Name
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This name will be displayed in the browser title bar, login page, and throughout the
              application.
            </Typography>

            <Box display="flex" alignItems="flex-start" gap={2}>
              <TextField
                label="Application Name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveAppName}
                disabled={loading || appName.trim() === ""}
                sx={{ mt: 3 }}
              >
                Save
              </Button>
            </Box>
          </Paper>

          {/* Logo Section */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Application Logo
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a custom logo to display in the application header. Accepted formats: JPG, PNG,
              SVG. Maximum size: 1MB.
            </Typography>

            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
              {/* Current Logo Display */}
              <Box flex={1} display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" gutterBottom>
                  Current Logo
                </Typography>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    width: "100%",
                    height: 150,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  {settings.logoPath ? (
                    <Box
                      component="img"
                      src={settings.logoPath}
                      alt="Current Logo"
                      sx={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Default Logo
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteLogo}
                  disabled={loadingLogo || !settings.logoPath}
                >
                  {loadingLogo ? <CircularProgress size={24} /> : "Remove Custom Logo"}
                </Button>
              </Box>

              {/* Logo Upload */}
              <Box flex={1} display="flex" flexDirection="column">
                <Typography variant="subtitle2" gutterBottom>
                  Upload New Logo
                </Typography>
                <Box
                  {...logoDropzone.getRootProps()}
                  sx={{
                    border: "2px dashed",
                    borderColor: "primary.main",
                    borderRadius: 1,
                    p: 2,
                    minHeight: 150,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    mb: 2,
                    ...(logoPreview && logoFile
                      ? {
                          backgroundImage: `url(${logoPreview})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : {}),
                  }}
                >
                  <input {...logoDropzone.getInputProps()} />
                  {!logoPreview || !logoFile ? (
                    <>
                      <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2" align="center">
                        Drag and drop a logo image here, or click to select
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center">
                        Supported formats: JPG, PNG, SVG (Max: 1MB)
                      </Typography>
                    </>
                  ) : null}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleUploadLogo}
                  disabled={loadingLogo || !logoFile}
                >
                  {loadingLogo ? <CircularProgress size={24} /> : "Upload Logo"}
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Favicon Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Browser Favicon
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a custom favicon to display in the browser tab. Accepted formats: PNG, ICO.
              Maximum size: 100KB.
            </Typography>

            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
              {/* Current Favicon Display */}
              <Box flex={1} display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" gutterBottom>
                  Current Favicon
                </Typography>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    width: "100%",
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  {settings.faviconPath ? (
                    <Box
                      component="img"
                      src={settings.faviconPath}
                      alt="Current Favicon"
                      sx={{
                        maxWidth: "64px",
                        maxHeight: "64px",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Default Favicon
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteFavicon}
                  disabled={loadingFavicon || !settings.faviconPath}
                >
                  {loadingFavicon ? <CircularProgress size={24} /> : "Remove Custom Favicon"}
                </Button>
              </Box>

              {/* Favicon Upload */}
              <Box flex={1} display="flex" flexDirection="column">
                <Typography variant="subtitle2" gutterBottom>
                  Upload New Favicon
                </Typography>
                <Box
                  {...faviconDropzone.getRootProps()}
                  sx={{
                    border: "2px dashed",
                    borderColor: "primary.main",
                    borderRadius: 1,
                    p: 2,
                    minHeight: 100,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    mb: 2,
                    ...(faviconPreview && faviconFile
                      ? {
                          backgroundImage: `url(${faviconPreview})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : {}),
                  }}
                >
                  <input {...faviconDropzone.getInputProps()} />
                  {!faviconPreview || !faviconFile ? (
                    <>
                      <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body2" align="center">
                        Drag and drop a favicon image here, or click to select
                      </Typography>
                      <Typography variant="caption" color="text.secondary" align="center">
                        Supported formats: PNG, ICO (Max: 100KB)
                      </Typography>
                    </>
                  ) : null}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleUploadFavicon}
                  disabled={loadingFavicon || !faviconFile}
                >
                  {loadingFavicon ? <CircularProgress size={24} /> : "Upload Favicon"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      )}

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleAlertClose} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleConfirmDialogClose}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmDialog.onConfirm();
              handleConfirmDialogClose();
            }}
            color="primary"
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
