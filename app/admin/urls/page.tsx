"use client";

import IconUpload from "@/app/components/ui/IconUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
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
  Grid,
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
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

interface Url {
  id: string;
  title: string;
  url: string;
  urlMobile: string | null;
  iconPath: string | null;
  idleTimeoutMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function UrlManagement() {
  const [urls, setUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"create" | "edit" | "delete">("create");
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);

  // Form state
  const [formValues, setFormValues] = useState({
    title: "",
    url: "",
    urlMobile: "",
    iconPath: "",
    idleTimeoutMinutes: 10,
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const fetchUrls = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/urls");

      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }

      const data = await response.json();
      setUrls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleOpenDialog = (type: "create" | "edit" | "delete", url?: Url) => {
    setDialogType(type);

    if (url) {
      setSelectedUrl(url);
      setFormValues({
        title: url.title,
        url: url.url,
        urlMobile: url.urlMobile || "",
        iconPath: url.iconPath || "",
        idleTimeoutMinutes: url.idleTimeoutMinutes || 10,
      });
    } else {
      setSelectedUrl(null);
      setFormValues({
        title: "",
        url: "",
        urlMobile: "",
        iconPath: "",
        idleTimeoutMinutes: 10,
      });
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: name === "idleTimeoutMinutes" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      let response;
      let successMessage = "";

      const submitData = {
        ...formValues,
        idleTimeoutMinutes: Number(formValues.idleTimeoutMinutes) || 10,
      };

      if (dialogType === "create") {
        response = await fetch("/api/admin/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        successMessage = "URL created successfully";
      } else if (dialogType === "edit" && selectedUrl) {
        response = await fetch(`/api/admin/urls/${selectedUrl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        successMessage = "URL updated successfully";
      } else if (dialogType === "delete" && selectedUrl) {
        response = await fetch(`/api/admin/urls/${selectedUrl.id}`, {
          method: "DELETE",
        });
        successMessage = "URL deleted successfully";
      }

      if (!response?.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.error || "Operation failed");
      }

      setSnackbar({
        open: true,
        message: successMessage,
        severity: "success",
      });

      fetchUrls();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "An unknown error occurred",
        severity: "error",
      });
    }
  };

  if (loading && urls.length === 0) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">URL Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog("create")}
        >
          Add URL
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {urls.length === 0 && !loading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1">
            No URLs found. Create your first URL to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Icon</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Mobile URL</TableCell>
                <TableCell>Idle Timeout</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {urls.map((url) => (
                <TableRow key={url.id}>
                  <TableCell sx={{ width: 120, padding: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        "& .MuiIconButton-root": {
                          opacity: 0.7,
                          transition: "opacity 0.2s",
                          "&:hover": {
                            opacity: 1,
                          },
                        },
                        "& > *": {
                          // Target direct children
                          marginTop: -1,
                          marginLeft: -1,
                        },
                      }}
                    >
                      <IconUpload
                        size={64}
                        iconUrl={url.iconPath}
                        onUploadSuccess={async (iconUrl) => {
                          try {
                            const response = await fetch(`/api/admin/urls/${url.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: url.title,
                                url: url.url,
                                urlMobile: url.urlMobile,
                                iconPath: iconUrl,
                                idleTimeoutMinutes: Number(url.idleTimeoutMinutes) || 10,
                              }),
                            });

                            if (!response.ok) {
                              throw new Error("Failed to update URL icon");
                            }

                            // Refresh the URLs list
                            fetchUrls();

                            // Show success message
                            setSnackbar({
                              open: true,
                              message: "Icon updated successfully",
                              severity: "success",
                            });
                          } catch (err) {
                            setSnackbar({
                              open: true,
                              message: "Failed to update URL icon",
                              severity: "error",
                            });
                          }
                        }}
                        onUploadError={(error) =>
                          setSnackbar({
                            open: true,
                            message: error,
                            severity: "error",
                          })
                        }
                        onDelete={async () => {
                          try {
                            // First delete the icon file
                            const deleteIconResponse = await fetch(
                              `/api/admin/icons?iconPath=${encodeURIComponent(url.iconPath || "")}`,
                              {
                                method: "DELETE",
                              },
                            );

                            if (!deleteIconResponse.ok) {
                              throw new Error("Failed to delete icon file");
                            }

                            // Then update the URL record
                            const updateUrlResponse = await fetch(`/api/admin/urls/${url.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ...url,
                                iconPath: null,
                              }),
                            });

                            if (!updateUrlResponse.ok) {
                              throw new Error("Failed to update URL");
                            }

                            // Refresh the URLs list
                            fetchUrls();

                            // Show success message
                            setSnackbar({
                              open: true,
                              message: "Icon removed successfully",
                              severity: "success",
                            });
                          } catch (err) {
                            setSnackbar({
                              open: true,
                              message: err instanceof Error ? err.message : "Failed to delete icon",
                              severity: "error",
                            });
                          }
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{url.title}</TableCell>
                  <TableCell>{url.url}</TableCell>
                  <TableCell>{url.urlMobile || "-"}</TableCell>
                  <TableCell>{url.idleTimeoutMinutes || "-"}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenDialog("edit", url)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleOpenDialog("delete", url)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* URL Dialog */}
      <Dialog
        open={openDialog && (dialogType === "create" || dialogType === "edit")}
        onClose={handleCloseDialog}
      >
        <DialogTitle>{dialogType === "create" ? "Create New URL" : "Edit URL"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                name="title"
                label="Title"
                fullWidth
                variant="outlined"
                value={formValues.title}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="url"
                label="URL"
                fullWidth
                variant="outlined"
                value={formValues.url}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="urlMobile"
                label="Mobile URL (optional)"
                fullWidth
                variant="outlined"
                value={formValues.urlMobile}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="idleTimeoutMinutes"
                label="Idle Timeout (minutes)"
                type="number"
                inputProps={{ min: 0 }}
                helperText="Minutes before iframe is unloaded when inactive. Set to 0 to disable auto-unloading."
                fullWidth
                variant="outlined"
                value={formValues.idleTimeoutMinutes}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === "create" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog && dialogType === "delete"} onClose={handleCloseDialog}>
        <DialogTitle>Delete URL</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the URL &quot;{selectedUrl?.title}&quot;?
            <br />
            <br />
            This will also remove it from all URL groups. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
