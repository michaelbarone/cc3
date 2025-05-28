"use client";

import {
  Add as AddIcon,
  ClearAll as ClearAllIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  InsertLink as InsertLinkIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
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
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

// Type definitions
interface Url {
  id: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  mobileSpecificUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  addedById: string | null;
  addedBy?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    urlInGroups: number;
  };
}

interface FormData {
  id?: string;
  originalUrl: string;
  title: string;
  faviconUrl: string | null;
  customFaviconFile: File | null;
  mobileSpecificUrl: string;
  notes: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  action: "create" | "update" | "delete";
  data?: Url;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
}

export default function GlobalUrlsPage() {
  const [urls, setUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: "create",
  });
  const [formData, setFormData] = useState<FormData>({
    originalUrl: "",
    title: "",
    faviconUrl: null,
    customFaviconFile: null,
    mobileSpecificUrl: "",
    notes: "",
  });
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const [autoDiscoveryLoading, setAutoDiscoveryLoading] = useState(false);
  const [autoDiscoveryFailed, setAutoDiscoveryFailed] = useState(false);
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);

  // Fetch URLs on component mount
  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/urls");
      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }
      const data = await response.json();
      setUrls(data);
    } catch (error) {
      console.error("Error fetching URLs:", error);
      showSnackbar("Error loading URLs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setFormData({
      originalUrl: "",
      title: "",
      faviconUrl: null,
      customFaviconFile: null,
      mobileSpecificUrl: "",
      notes: "",
    });
    setFormMode("create");
    setFormDialogOpen(true);
    setPreviewIconUrl(null);
    setAutoDiscoveryFailed(false);
  };

  const handleEditClick = (url: Url) => {
    setFormData({
      id: url.id,
      originalUrl: url.url,
      title: url.title,
      faviconUrl: url.faviconUrl,
      customFaviconFile: null,
      mobileSpecificUrl: url.mobileSpecificUrl || "",
      notes: url.notes || "",
    });
    setFormMode("edit");
    setFormDialogOpen(true);
    setPreviewIconUrl(url.faviconUrl);
    setAutoDiscoveryFailed(false);
  };

  const handleDeleteClick = (url: Url) => {
    setConfirmDialog({
      open: true,
      title: "Confirm URL Deletion",
      message: `Are you sure you want to delete the URL "${url.title}"? This URL will be removed from all groups. This action cannot be undone.`,
      action: "delete",
      data: url,
    });
  };

  const handleFormSubmit = () => {
    // Validate form
    if (!formData.originalUrl.trim()) {
      showSnackbar("URL is required", "error");
      return;
    }

    if (!formData.title.trim()) {
      showSnackbar("Title is required", "error");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: formMode === "create" ? "Confirm URL Creation" : "Confirm URL Update",
      message:
        formMode === "create"
          ? `Are you sure you want to create a new URL "${formData.title}"?`
          : `Are you sure you want to save changes to URL "${formData.title}"?`,
      action: formMode === "create" ? "create" : "update",
    });
  };

  const confirmAction = async () => {
    try {
      if (confirmDialog.action === "create") {
        await createUrl();
      } else if (confirmDialog.action === "update") {
        await updateUrl();
      } else if (confirmDialog.action === "delete" && confirmDialog.data) {
        await deleteUrl(confirmDialog.data.id);
      }
    } catch (error) {
      console.error("Error performing action:", error);
      showSnackbar(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const createUrl = async () => {
    // Prepare data
    const urlData = {
      originalUrl: formData.originalUrl.trim(),
      title: formData.title.trim(),
      faviconUrl: formData.faviconUrl,
      mobileSpecificUrl: formData.mobileSpecificUrl.trim() || null,
      notes: formData.notes.trim() || null,
    };

    // Submit to API
    const response = await fetch("/api/admin/urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(urlData),
    });

    if (response.status === 409) {
      const error = await response.json();
      showSnackbar(`URL exists as '${error.existingUrl.title}'`, "error");
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create URL");
    }

    // Success
    setFormDialogOpen(false);
    showSnackbar("URL created successfully", "success");
    fetchUrls(); // Refresh the list
  };

  const updateUrl = async () => {
    if (!formData.id) return;

    // Prepare data
    const urlData = {
      originalUrl: formData.originalUrl.trim(),
      title: formData.title.trim(),
      faviconUrl: formData.faviconUrl,
      mobileSpecificUrl: formData.mobileSpecificUrl.trim() || null,
      notes: formData.notes.trim() || null,
    };

    // Submit to API
    const response = await fetch(`/api/admin/urls/${formData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(urlData),
    });

    if (response.status === 409) {
      const error = await response.json();
      showSnackbar(`URL exists as '${error.existingUrl.title}'`, "error");
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update URL");
    }

    // Success
    setFormDialogOpen(false);
    showSnackbar("URL updated successfully", "success");
    fetchUrls(); // Refresh the list
  };

  const deleteUrl = async (urlId: string) => {
    const response = await fetch(`/api/admin/urls/${urlId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete URL");
    }

    // Success
    showSnackbar("URL deleted successfully", "success");
    fetchUrls(); // Refresh the list
  };

  const handleCloseDialog = () => {
    setFormDialogOpen(false);
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const showSnackbar = (message: string, severity: "success" | "error" | "info") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCheckForFavicon = async () => {
    if (!formData.originalUrl.trim()) {
      showSnackbar("Please enter a URL first", "error");
      return;
    }

    setAutoDiscoveryLoading(true);
    setAutoDiscoveryFailed(false);

    try {
      // Create a mock URL object to validate the URL format
      new URL(formData.originalUrl);

      // In a real implementation, we would call an API endpoint to discover the favicon
      // For now, we'll simulate by using the API directly
      const urlData = {
        originalUrl: formData.originalUrl.trim(),
        title: formData.title || "Test",
      };

      const response = await fetch("/api/admin/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urlData),
      });

      if (response.status === 409) {
        // URL exists but we can still extract the favicon from the response
        const data = await response.json();
        if (data.existingUrl?.faviconUrl) {
          setFormData({
            ...formData,
            faviconUrl: data.existingUrl.faviconUrl,
          });
          setPreviewIconUrl(data.existingUrl.faviconUrl);
          showSnackbar("Found favicon from existing URL", "info");
        } else {
          setAutoDiscoveryFailed(true);
          showSnackbar("No favicon found for this URL", "error");
        }
      } else if (response.ok) {
        // URL was created temporarily, but we need to delete it and just keep the favicon
        const data = await response.json();

        // Delete the temporary URL
        await fetch(`/api/admin/urls/${data.id}`, {
          method: "DELETE",
        });

        if (data.faviconUrl) {
          setFormData({
            ...formData,
            faviconUrl: data.faviconUrl,
          });
          setPreviewIconUrl(data.faviconUrl);
          showSnackbar("Favicon discovered successfully", "success");
        } else {
          setAutoDiscoveryFailed(true);
          showSnackbar("No favicon found for this URL", "error");
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to discover favicon");
      }
    } catch (error) {
      console.error("Error discovering favicon:", error);
      setAutoDiscoveryFailed(true);
      showSnackbar("Failed to discover favicon. Please check the URL format.", "error");
    } finally {
      setAutoDiscoveryLoading(false);
    }
  };

  const handleRemoveFavicon = () => {
    setFormData({
      ...formData,
      faviconUrl: null,
      customFaviconFile: null,
    });
    setPreviewIconUrl(null);
  };

  // Handle file drops for custom favicon upload
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Check file type
      if (!["image/jpeg", "image/png", "image/x-icon"].includes(file.type)) {
        showSnackbar("Please upload a JPG, PNG, or ICO file", "error");
        return;
      }

      // Check file size (100KB max)
      if (file.size > 100 * 1024) {
        showSnackbar("File size must be under 100KB", "error");
        return;
      }

      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewIconUrl(objectUrl);

      setFormData({
        ...formData,
        customFaviconFile: file,
        faviconUrl: null, // Reset auto-discovered favicon
      });
    },
    [formData],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/x-icon": [".ico"],
    },
    maxFiles: 1,
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Global URLs
        </Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create New URL
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Icon</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Used In Groups</TableCell>
                <TableCell>Added By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {urls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No URLs found. Create your first URL using the button above.
                  </TableCell>
                </TableRow>
              ) : (
                urls.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell>
                      {url.faviconUrl ? (
                        <Box
                          component="span"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            width: 24,
                            height: 24,
                            overflow: "hidden",
                          }}
                        >
                          <Image
                            src={url.faviconUrl}
                            alt=""
                            width={24}
                            height={24}
                            style={{ objectFit: "contain" }}
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </Box>
                      ) : (
                        <InsertLinkIcon color="disabled" fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell>{url.title}</TableCell>
                    <TableCell>
                      <Tooltip title={url.url}>
                        <span>
                          {url.url.length > 50 ? `${url.url.substring(0, 50)}...` : url.url}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{url._count?.urlInGroups || 0}</TableCell>
                    <TableCell>{url.addedBy?.name || "-"}</TableCell>
                    <TableCell>
                      <Box display="flex">
                        <Tooltip title="Edit URL">
                          <IconButton
                            color="primary"
                            onClick={() => handleEditClick(url)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete URL">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(url)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit URL Dialog */}
      <Dialog open={formDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === "create" ? "Create New Global URL" : "Edit Global URL"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            required
            value={formData.originalUrl}
            onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
            helperText="The original URL to be displayed in the iframe"
          />
          <TextField
            margin="dense"
            label="Title"
            type="text"
            fullWidth
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            helperText="A descriptive title for this URL"
          />

          {/* Favicon Management Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              URL Icon / Favicon
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Icon Preview */}
            <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                Current Icon:
              </Typography>
              {previewIconUrl ? (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    p: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src={previewIconUrl}
                    alt="Icon Preview"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No icon selected
                </Typography>
              )}
            </Box>

            {/* Icon Actions */}
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleCheckForFavicon}
                disabled={autoDiscoveryLoading || !formData.originalUrl}
                size="small"
              >
                {autoDiscoveryLoading ? <CircularProgress size={20} /> : "Auto-Discover Icon"}
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearAllIcon />}
                onClick={handleRemoveFavicon}
                disabled={!previewIconUrl}
                size="small"
              >
                Remove Icon
              </Button>
            </Box>

            {/* Upload Custom Icon */}
            <Box
              {...getRootProps()}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive ? "primary.main" : "divider",
                borderRadius: 1,
                p: 2,
                textAlign: "center",
                backgroundColor: isDragActive ? "action.hover" : "background.paper",
                cursor: "pointer",
                mb: 2,
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon color="action" sx={{ mb: 1 }} />
              <Typography variant="body2" gutterBottom>
                {isDragActive
                  ? "Drop the icon here..."
                  : "Drag & drop a custom icon here, or click to select"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Accepts JPG, PNG, or ICO (max 100KB)
              </Typography>
            </Box>

            {autoDiscoveryFailed && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No icon could be automatically discovered. You can try uploading a custom icon or
                leave it blank.
              </Alert>
            )}
          </Box>

          <TextField
            margin="dense"
            label="Mobile-Specific URL (Optional)"
            type="url"
            fullWidth
            value={formData.mobileSpecificUrl}
            onChange={(e) => setFormData({ ...formData, mobileSpecificUrl: e.target.value })}
            helperText="Alternative URL to use on mobile devices (if different from main URL)"
          />

          <TextField
            margin="dense"
            label="Notes (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            helperText="Optional notes about this URL"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleFormSubmit} color="primary" variant="contained">
            {formMode === "create" ? "Create URL" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

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
            onClick={confirmAction}
            color={confirmDialog.action === "delete" ? "error" : "primary"}
            variant="contained"
            autoFocus
          >
            {confirmDialog.action === "create"
              ? "Create"
              : confirmDialog.action === "update"
                ? "Save"
                : "Delete"}
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
