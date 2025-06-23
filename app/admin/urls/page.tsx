"use client";

import IconUpload from "@/app/components/ui/IconUpload";
import UrlDialog from "@/app/components/ui/UrlDialog";
import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  isLocalhost: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePath?: string | null;
  localhostMobilePort?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
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
    idleTimeoutMinutes: 0,
    isLocalhost: false,
    port: "",
    path: "",
    enableMobileOverride: false,
    localhostMobilePort: "",
    localhostMobilePath: "",
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const [isSavingAndAddingAnother, setIsSavingAndAddingAnother] = useState(false);

  // Groups dialog state
  const [openGroupsDialog, setOpenGroupsDialog] = useState(false);
  const [selectedUrlForGroups, setSelectedUrlForGroups] = useState<Url | null>(null);
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Add a new state variable to track URL groups
  const [urlToGroups, setUrlToGroups] = useState<Record<string, UrlGroup[]>>({});
  const [loadingUrlGroups, setLoadingUrlGroups] = useState(true);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/urls");

      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }

      const data = await response.json();
      setUrls(data);

      // Fetch groups for all URLs after URLs are loaded
      if (data.length > 0) {
        await fetchUrlGroups(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  // Fetch groups for all URLs
  const fetchUrlGroups = async (urlsList: Url[]) => {
    try {
      setLoadingUrlGroups(true);
      // Fetch groups for URLs in small batches to avoid too many concurrent requests
      const urlGroupsMap: Record<string, UrlGroup[]> = {};
      const batchSize = 3; // Process URLs in small batches

      for (let i = 0; i < urlsList.length; i += batchSize) {
        const batch = urlsList.slice(i, i + batchSize);

        // Create an array of promises for this batch
        const promises = batch.map((url) =>
          fetch(`/api/admin/urls/${url.id}/url-groups`)
            .then((response) => {
              if (response.ok) {
                return response.json().then((groups) => {
                  urlGroupsMap[url.id] = groups;
                });
              }
              return null;
            })
            .catch((err) => {
              console.error(`Error fetching groups for URL ${url.id}:`, err);
              return null;
            }),
        );

        // Wait for this batch to complete before moving to the next
        await Promise.all(promises);
      }

      setUrlToGroups(urlGroupsMap);
    } catch (err) {
      console.error("Error fetching URL groups:", err);
    } finally {
      setLoadingUrlGroups(false);
    }
  };

  const handleOpenDialog = (type: "create" | "edit" | "delete", url?: Url) => {
    setDialogType(type);

    if (url) {
      setSelectedUrl(url);
      const hasMobileOverride = !!(url.localhostMobilePort || url.localhostMobilePath);
      setFormValues({
        title: url.title,
        url: url.url,
        urlMobile: url.urlMobile || "",
        iconPath: url.iconPath || "",
        idleTimeoutMinutes: url.idleTimeoutMinutes || 10,
        isLocalhost: url.isLocalhost || false,
        port: url.port || "",
        path: url.path || "",
        enableMobileOverride: hasMobileOverride,
        localhostMobilePort: url.localhostMobilePort || "",
        localhostMobilePath: url.localhostMobilePath || "",
      });
    } else {
      setSelectedUrl(null);
      setFormValues({
        title: "",
        url: "",
        urlMobile: "",
        iconPath: "",
        idleTimeoutMinutes: 0,
        isLocalhost: false,
        port: "",
        path: "",
        enableMobileOverride: false,
        localhostMobilePort: "",
        localhostMobilePath: "",
      });
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Groups dialog functions
  const handleOpenGroupsDialog = (url: Url) => {
    setSelectedUrlForGroups(url);
    setOpenGroupsDialog(true);
    fetchUrlGroupsForManagement(url.id);
    fetchAllGroups();
  };

  const handleCloseGroupsDialog = () => {
    setOpenGroupsDialog(false);
    setSelectedUrlForGroups(null);
  };

  const fetchAllGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await fetch("/api/admin/url-groups");

      if (!response.ok) {
        throw new Error("Failed to fetch URL groups");
      }

      const data = await response.json();
      setUrlGroups(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch URL groups",
        severity: "error",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchUrlGroupsForManagement = async (urlId: string) => {
    try {
      setLoadingGroups(true);
      const response = await fetch(`/api/admin/urls/${urlId}/url-groups`);

      if (!response.ok) {
        throw new Error("Failed to fetch URL groups");
      }

      const data = await response.json();
      setSelectedGroups(data.map((group: { id: string }) => group.id));
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch URL groups",
        severity: "error",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSaveUrlGroups = async () => {
    if (!selectedUrlForGroups) return;

    try {
      setLoadingGroups(true);
      const response = await fetch(`/api/admin/urls/${selectedUrlForGroups.id}/url-groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlGroupIds: selectedGroups }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to update URL groups");
      }

      // Update the urlToGroups state with the new selection
      const updatedGroups = urlGroups.filter((group) => selectedGroups.includes(group.id));
      setUrlToGroups((prev) => ({
        ...prev,
        [selectedUrlForGroups.id]: updatedGroups,
      }));

      setSnackbar({
        open: true,
        message: "URL groups updated successfully",
        severity: "success",
      });

      handleCloseGroupsDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to update URL groups",
        severity: "error",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: name === "idleTimeoutMinutes" ? Number(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const isFormValid = () => {
    if (formValues.title.trim() === "") return false;

    if (formValues.isLocalhost) {
      // For localhost, require at least port or path
      const hasPortOrPath = !!formValues.port || !!formValues.path;
      // If path is provided, it must start with /
      const pathValid = !formValues.path || formValues.path.startsWith("/");
      // Check mobile override if enabled
      const mobileValid =
        !formValues.enableMobileOverride ||
        !formValues.localhostMobilePath ||
        formValues.localhostMobilePath.startsWith("/");

      return hasPortOrPath && pathValid && mobileValid;
    } else {
      // For regular URLs, require the url field
      return formValues.url.trim() !== "";
    }
  };

  const handleSubmit = async (formData?: any) => {
    try {
      let response;
      let successMessage = "";

      const submitData = formData || formValues;
      // Remove the saveAndAddAnother flag from the data sent to the API
      const { saveAndAddAnother, ...apiData } = submitData;

      // Set the flag to prevent re-renders during Save and Add Another
      setIsSavingAndAddingAnother(!!saveAndAddAnother);

      if (dialogType === "create") {
        response = await fetch("/api/admin/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        });
        successMessage = "URL created successfully";
      } else if (dialogType === "edit" && selectedUrl) {
        response = await fetch(`/api/admin/urls/${selectedUrl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiData),
        });
        successMessage = "URL updated successfully";
      } else if (dialogType === "delete" && selectedUrl) {
        response = await fetch(`/api/admin/urls/${selectedUrl.id}`, {
          method: "DELETE",
        });
        successMessage = "URL deleted successfully";

        // If deleting a URL, remove its groups from the state
        if (selectedUrl) {
          setUrlToGroups((prev) => {
            const updated = { ...prev };
            delete updated[selectedUrl.id];
            return updated;
          });
        }
      }

      if (!response?.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.error || "Operation failed");
      }

      // Show success message
      setSnackbar({
        open: true,
        message: successMessage,
        severity: "success",
      });

      if (saveAndAddAnother) {
        // For Save and Add Another, don't reset form values here
        // The UrlDialog component will handle resetting the form

        // Update URLs list in the background without triggering a re-render of the dialog
        fetch("/api/admin/urls")
          .then((response) => response.json())
          .then((data) => {
            setUrls(data);
          })
          .catch((error) => {
            console.error("Error fetching URLs:", error);
          });
      } else {
        // For normal save, fetch URLs and close dialog
        fetchUrls();
        handleCloseDialog();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "An unknown error occurred",
        severity: "error",
      });
    } finally {
      // Reset the flag
      setIsSavingAndAddingAnother(false);
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
                <TableCell>Localhost</TableCell>
                <TableCell>Idle Timeout</TableCell>
                <TableCell>Groups</TableCell>
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
                                ...url, // Include all URL properties
                                iconPath: iconUrl, // Override just the icon path
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
                  <TableCell>
                    {url.isLocalhost ? (
                      <Box>
                        <Typography variant="body2">{getEffectiveUrl(url, false)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uses browser hostname
                        </Typography>
                      </Box>
                    ) : (
                      url.url
                    )}
                  </TableCell>
                  <TableCell>
                    {url.isLocalhost && (url.localhostMobilePort || url.localhostMobilePath) ? (
                      <Box>
                        <Typography variant="body2">{getEffectiveUrl(url, true)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mobile override
                        </Typography>
                      </Box>
                    ) : url.isLocalhost ? (
                      <Typography variant="body2">Same as desktop</Typography>
                    ) : (
                      url.urlMobile || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {url.isLocalhost ? (
                      <Chip size="small" color="primary" label="Enabled" variant="outlined" />
                    ) : (
                      <Chip size="small" color="default" label="Disabled" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{url.idleTimeoutMinutes || "-"}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                        {loadingUrlGroups ? (
                          <CircularProgress size={20} />
                        ) : urlToGroups[url.id]?.length > 0 ? (
                          urlToGroups[url.id].map((group) => (
                            <Chip
                              key={group.id}
                              label={group.name}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ mb: 0.5 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No groups assigned
                          </Typography>
                        )}
                      </Box>
                      <Button
                        startIcon={<GroupIcon />}
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenGroupsDialog(url)}
                      >
                        Manage
                      </Button>
                    </Box>
                  </TableCell>
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
      {(dialogType === "create" || dialogType === "edit") && (
        <UrlDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          initialValues={selectedUrl || undefined}
          dialogTitle={dialogType === "create" ? "Create New URL" : "Edit URL"}
          submitButtonText={dialogType === "create" ? "Save and Close" : "Save"}
          showSaveAndAddAnother={dialogType === "create"}
        />
      )}

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
          <Button onClick={() => handleSubmit()} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Groups Dialog */}
      <Dialog open={openGroupsDialog} onClose={handleCloseGroupsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Manage Groups for {selectedUrlForGroups?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which URL groups this URL should belong to
          </Typography>

          {loadingGroups ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : urlGroups.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: "center", py: 2 }}>
              No URL groups found
            </Typography>
          ) : (
            <List sx={{ maxHeight: "400px", overflow: "auto" }}>
              {urlGroups.map((group) => (
                <ListItem key={group.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">{group.name}</Typography>
                        {group.description && (
                          <Typography variant="body2" color="text.secondary">
                            {group.description}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ width: "100%" }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupsDialog}>Cancel</Button>
          <Button onClick={handleSaveUrlGroups} variant="contained" disabled={loadingGroups}>
            Save
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
