"use client";

import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
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
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Type definitions
interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface Url {
  id: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  mobileSpecificUrl: string | null;
  notes: string | null;
}

interface UrlInGroup {
  id: string;
  urlId: string;
  groupId: string;
  groupSpecificTitle: string | null;
  displayOrderInGroup: number;
  url: Url;
}

interface AddUrlFormData {
  urlId: string;
  groupSpecificTitle: string;
  displayOrderInGroup: string;
}

interface EditUrlInGroupFormData {
  id: string;
  groupSpecificTitle: string;
  displayOrderInGroup: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  action: "add" | "update" | "remove";
  data?: any;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export default function ManageGroupUrlsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [urlsInGroup, setUrlsInGroup] = useState<UrlInGroup[]>([]);
  const [availableUrls, setAvailableUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupLoading, setGroupLoading] = useState(true);
  const [urlsLoading, setUrlsLoading] = useState(true);
  const [availableUrlsLoading, setAvailableUrlsLoading] = useState(true);

  const [addUrlDialogOpen, setAddUrlDialogOpen] = useState(false);
  const [editUrlDialogOpen, setEditUrlDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: "add",
  });

  const [addUrlFormData, setAddUrlFormData] = useState<AddUrlFormData>({
    urlId: "",
    groupSpecificTitle: "",
    displayOrderInGroup: "10",
  });

  const [editFormData, setEditFormData] = useState<EditUrlInGroupFormData>({
    id: "",
    groupSpecificTitle: "",
    displayOrderInGroup: "0",
  });

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch necessary data on component mount
  useEffect(() => {
    Promise.all([fetchGroupDetails(), fetchUrlsInGroup(), fetchAvailableUrls()]).then(() => {
      setLoading(false);
    });
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setGroupLoading(true);
    try {
      const response = await fetch(`/api/admin/urlGroups/${groupId}`);
      if (!response.ok) {
        if (response.status === 404) {
          showSnackbar("Group not found", "error");
          router.push("/admin/url-groups");
          return;
        }
        throw new Error("Failed to fetch group details");
      }
      const data = await response.json();
      setGroup(data);
    } catch (error) {
      console.error("Error fetching group details:", error);
      showSnackbar("Error loading group details", "error");
    } finally {
      setGroupLoading(false);
    }
  };

  const fetchUrlsInGroup = async () => {
    setUrlsLoading(true);
    try {
      const response = await fetch(`/api/admin/urlGroups/${groupId}/urls`);
      if (!response.ok) {
        throw new Error("Failed to fetch URLs in group");
      }
      const data = await response.json();
      setUrlsInGroup(data);
    } catch (error) {
      console.error("Error fetching URLs in group:", error);
      showSnackbar("Error loading URLs in group", "error");
    } finally {
      setUrlsLoading(false);
    }
  };

  const fetchAvailableUrls = async () => {
    setAvailableUrlsLoading(true);
    try {
      const response = await fetch("/api/admin/urls");
      if (!response.ok) {
        throw new Error("Failed to fetch available URLs");
      }
      const data = await response.json();
      setAvailableUrls(data);
    } catch (error) {
      console.error("Error fetching available URLs:", error);
      showSnackbar("Error loading available URLs", "error");
    } finally {
      setAvailableUrlsLoading(false);
    }
  };

  const handleAddUrlClick = () => {
    setAddUrlFormData({
      urlId: "",
      groupSpecificTitle: "",
      displayOrderInGroup: "10",
    });
    setAddUrlDialogOpen(true);
  };

  const handleEditUrlClick = (urlInGroup: UrlInGroup) => {
    setEditFormData({
      id: urlInGroup.id,
      groupSpecificTitle: urlInGroup.groupSpecificTitle || "",
      displayOrderInGroup: urlInGroup.displayOrderInGroup.toString(),
    });
    setEditUrlDialogOpen(true);
  };

  const handleRemoveUrlClick = (urlInGroup: UrlInGroup) => {
    setConfirmDialog({
      open: true,
      title: "Remove URL from Group",
      message: `Are you sure you want to remove "${urlInGroup.url.title}" from this group? This will not delete the global URL, only remove it from this group.`,
      action: "remove",
      data: urlInGroup,
    });
  };

  const handleAddUrlSubmit = () => {
    // Validate form
    if (!addUrlFormData.urlId) {
      showSnackbar("Please select a URL to add", "error");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Add URL to Group",
      message: `Are you sure you want to add this URL to the group?`,
      action: "add",
    });
  };

  const handleEditUrlSubmit = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: "Update URL in Group",
      message: `Are you sure you want to save these changes?`,
      action: "update",
    });
  };

  const confirmAction = async () => {
    try {
      if (confirmDialog.action === "add") {
        await addUrlToGroup();
      } else if (confirmDialog.action === "update") {
        await updateUrlInGroup();
      } else if (confirmDialog.action === "remove" && confirmDialog.data) {
        await removeUrlFromGroup(confirmDialog.data.id);
      }
    } catch (error) {
      console.error("Error performing action:", error);
      showSnackbar(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const addUrlToGroup = async () => {
    // Prepare data
    const urlData = {
      urlId: addUrlFormData.urlId,
      groupSpecificTitle: addUrlFormData.groupSpecificTitle.trim() || null,
      displayOrderInGroup: addUrlFormData.displayOrderInGroup
        ? parseInt(addUrlFormData.displayOrderInGroup)
        : 10,
    };

    // Submit to API
    const response = await fetch(`/api/admin/urlGroups/${groupId}/urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(urlData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add URL to group");
    }

    // Success
    setAddUrlDialogOpen(false);
    showSnackbar("URL added to group successfully", "success");
    fetchUrlsInGroup(); // Refresh the list
  };

  const updateUrlInGroup = async () => {
    // Prepare data
    const urlData = {
      groupSpecificTitle: editFormData.groupSpecificTitle.trim() || null,
      displayOrderInGroup: editFormData.displayOrderInGroup
        ? parseInt(editFormData.displayOrderInGroup)
        : 0,
    };

    // Submit to API
    const response = await fetch(`/api/admin/urlGroups/${groupId}/urls/${editFormData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(urlData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update URL in group");
    }

    // Success
    setEditUrlDialogOpen(false);
    showSnackbar("URL in group updated successfully", "success");
    fetchUrlsInGroup(); // Refresh the list
  };

  const removeUrlFromGroup = async (urlInGroupId: string) => {
    const response = await fetch(`/api/admin/urlGroups/${groupId}/urls/${urlInGroupId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove URL from group");
    }

    // Success
    showSnackbar("URL removed from group successfully", "success");
    fetchUrlsInGroup(); // Refresh the list
  };

  const handleCloseAddDialog = () => {
    setAddUrlDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditUrlDialogOpen(false);
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
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

  const handleBackToGroups = () => {
    router.push("/admin/url-groups");
  };

  // Filter out URLs that are already in the group
  const getFilteredAvailableUrls = () => {
    if (!urlsInGroup.length) return availableUrls;

    const urlIdsInGroup = new Set(urlsInGroup.map((u) => u.urlId));
    return availableUrls.filter((url) => !urlIdsInGroup.has(url.id));
  };

  const filteredAvailableUrls = getFilteredAvailableUrls();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToGroups}
            sx={{ mb: 2 }}
          >
            Back to URL Groups
          </Button>
          <Typography variant="h4" component="h1">
            {groupLoading ? "Loading..." : `URLs in Group: ${group?.name}`}
          </Typography>
          {group?.description && (
            <Typography variant="body1" color="text.secondary" mt={1}>
              {group.description}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={handleAddUrlClick}
          disabled={availableUrlsLoading || filteredAvailableUrls.length === 0}
        >
          Add URL to Group
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
                <TableCell>Title in Group</TableCell>
                <TableCell>Original URL</TableCell>
                <TableCell>Display Order</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {urlsInGroup.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No URLs in this group. Add URLs using the button above.
                  </TableCell>
                </TableRow>
              ) : (
                urlsInGroup.map((urlInGroup) => (
                  <TableRow key={urlInGroup.id}>
                    <TableCell>
                      {urlInGroup.url.faviconUrl ? (
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
                            src={urlInGroup.url.faviconUrl}
                            alt=""
                            width={24}
                            height={24}
                            style={{ objectFit: "contain" }}
                            unoptimized
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{urlInGroup.groupSpecificTitle || urlInGroup.url.title}</TableCell>
                    <TableCell>
                      <Tooltip title={urlInGroup.url.url}>
                        <span>
                          {urlInGroup.url.url.length > 50
                            ? `${urlInGroup.url.url.substring(0, 50)}...`
                            : urlInGroup.url.url}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{urlInGroup.displayOrderInGroup}</TableCell>
                    <TableCell>
                      <Box display="flex">
                        <Tooltip title="Edit URL in group">
                          <IconButton
                            color="primary"
                            onClick={() => handleEditUrlClick(urlInGroup)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove URL from group">
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveUrlClick(urlInGroup)}
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

      {/* Add URL to Group Dialog */}
      <Dialog open={addUrlDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add URL to Group</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Select URL to Add
            </Typography>
            {availableUrlsLoading ? (
              <CircularProgress size={24} />
            ) : filteredAvailableUrls.length === 0 ? (
              <Typography color="error">All available URLs are already in this group.</Typography>
            ) : (
              <Select
                value={addUrlFormData.urlId}
                onChange={(e) => {
                  const selectedUrlId = e.target.value;
                  const selectedUrl = availableUrls.find((url) => url.id === selectedUrlId);
                  setAddUrlFormData({
                    ...addUrlFormData,
                    urlId: selectedUrlId,
                    groupSpecificTitle: selectedUrl?.title || "",
                  });
                }}
                fullWidth
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select a URL
                </MenuItem>
                {filteredAvailableUrls.map((url) => (
                  <MenuItem key={url.id} value={url.id}>
                    <Box display="flex" alignItems="center">
                      {url.faviconUrl && (
                        <Box mr={1} sx={{ width: 16, height: 16, overflow: "hidden" }}>
                          <Image
                            src={url.faviconUrl}
                            alt=""
                            width={16}
                            height={16}
                            style={{ objectFit: "contain" }}
                            unoptimized
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </Box>
                      )}
                      {url.title}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          <TextField
            margin="dense"
            label="Group-Specific Title (Optional)"
            type="text"
            fullWidth
            value={addUrlFormData.groupSpecificTitle}
            onChange={(e) =>
              setAddUrlFormData({ ...addUrlFormData, groupSpecificTitle: e.target.value })
            }
            helperText="Custom title that will be displayed only in this group. Leave empty to use the global title."
          />
          <TextField
            margin="dense"
            label="Display Order in Group"
            type="number"
            fullWidth
            value={addUrlFormData.displayOrderInGroup}
            onChange={(e) =>
              setAddUrlFormData({ ...addUrlFormData, displayOrderInGroup: e.target.value })
            }
            helperText="Lower values appear first. URLs are sorted by this value."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleAddUrlSubmit}
            color="primary"
            variant="contained"
            disabled={!addUrlFormData.urlId || availableUrlsLoading}
          >
            Add URL to Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit URL in Group Dialog */}
      <Dialog open={editUrlDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit URL in Group</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Group-Specific Title (Optional)"
            type="text"
            fullWidth
            value={editFormData.groupSpecificTitle}
            onChange={(e) =>
              setEditFormData({ ...editFormData, groupSpecificTitle: e.target.value })
            }
            helperText="Custom title that will be displayed only in this group. Leave empty to use the global title."
          />
          <TextField
            margin="dense"
            label="Display Order in Group"
            type="number"
            fullWidth
            value={editFormData.displayOrderInGroup}
            onChange={(e) =>
              setEditFormData({ ...editFormData, displayOrderInGroup: e.target.value })
            }
            helperText="Lower values appear first. URLs are sorted by this value."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleEditUrlSubmit} color="primary" variant="contained">
            Save Changes
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
            color={confirmDialog.action === "remove" ? "error" : "primary"}
            variant="contained"
            autoFocus
          >
            {confirmDialog.action === "add"
              ? "Add"
              : confirmDialog.action === "update"
                ? "Save"
                : "Remove"}
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
