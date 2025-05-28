"use client";

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Link as LinkIcon,
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
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Type definitions
interface Group {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    urlsInGroup: number;
    userAccesses: number;
  };
}

interface FormData {
  id?: string;
  name: string;
  description: string;
  displayOrder: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  action: "create" | "update" | "delete";
  data?: Group;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export default function UrlGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: "create",
  });
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    displayOrder: "0",
  });
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/urlGroups");
      if (!response.ok) {
        throw new Error("Failed to fetch URL groups");
      }
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching URL groups:", error);
      showSnackbar("Error loading URL groups", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setFormData({
      name: "",
      description: "",
      displayOrder: "0",
    });
    setFormMode("create");
    setFormDialogOpen(true);
  };

  const handleEditClick = (group: Group) => {
    setFormData({
      id: group.id,
      name: group.name,
      description: group.description || "",
      displayOrder: group.displayOrder?.toString() || "0",
    });
    setFormMode("edit");
    setFormDialogOpen(true);
  };

  const handleFormSubmit = () => {
    // Validate form
    if (!formData.name.trim()) {
      showSnackbar("Group name is required", "error");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: formMode === "create" ? "Confirm Group Creation" : "Confirm Group Update",
      message:
        formMode === "create"
          ? `Are you sure you want to create a new group named "${formData.name}"?`
          : `Are you sure you want to save changes to group "${formData.name}"?`,
      action: formMode === "create" ? "create" : "update",
    });
  };

  const handleDeleteClick = (group: Group) => {
    setConfirmDialog({
      open: true,
      title: "Confirm Group Deletion",
      message: `Are you sure you want to delete the group "${group.name}"? This will also remove all URLs from this group and user access to this group. This action cannot be undone.`,
      action: "delete",
      data: group,
    });
  };

  const confirmAction = async () => {
    try {
      if (confirmDialog.action === "create") {
        await createGroup();
      } else if (confirmDialog.action === "update") {
        await updateGroup();
      } else if (confirmDialog.action === "delete" && confirmDialog.data) {
        await deleteGroup(confirmDialog.data.id);
      }
    } catch (error) {
      console.error("Error performing action:", error);
      showSnackbar(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const createGroup = async () => {
    // Prepare data
    const groupData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
    };

    // Submit to API
    const response = await fetch("/api/admin/urlGroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group");
    }

    // Success
    setFormDialogOpen(false);
    showSnackbar("Group created successfully", "success");
    fetchGroups(); // Refresh the list
  };

  const updateGroup = async () => {
    if (!formData.id) return;

    // Prepare data
    const groupData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
    };

    // Submit to API
    const response = await fetch(`/api/admin/urlGroups/${formData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update group");
    }

    // Success
    setFormDialogOpen(false);
    showSnackbar("Group updated successfully", "success");
    fetchGroups(); // Refresh the list
  };

  const deleteGroup = async (groupId: string) => {
    const response = await fetch(`/api/admin/urlGroups/${groupId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete group");
    }

    // Success
    showSnackbar("Group deleted successfully", "success");
    fetchGroups(); // Refresh the list
  };

  const handleCloseDialog = () => {
    setFormDialogOpen(false);
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

  const handleManageUrls = (groupId: string) => {
    router.push(`/admin/url-groups/${groupId}/urls`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          URL Groups
        </Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create New Group
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
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Display Order</TableCell>
                <TableCell>URLs</TableCell>
                <TableCell>User Access</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No URL groups found. Create your first group using the button above.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.description || "-"}</TableCell>
                    <TableCell>{group.displayOrder === null ? "-" : group.displayOrder}</TableCell>
                    <TableCell>{group._count?.urlsInGroup || 0}</TableCell>
                    <TableCell>{group._count?.userAccesses || 0}</TableCell>
                    <TableCell>{group.createdBy?.name || "-"}</TableCell>
                    <TableCell>
                      {group.createdAt
                        ? format(new Date(group.createdAt), "yyyy-MM-dd HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Box display="flex">
                        <Tooltip title="Manage URLs in this group">
                          <IconButton
                            color="primary"
                            onClick={() => handleManageUrls(group.id)}
                            size="small"
                          >
                            <LinkIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit group">
                          <IconButton
                            color="primary"
                            onClick={() => handleEditClick(group)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete group">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(group)}
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

      {/* Create/Edit Group Dialog */}
      <Dialog open={formDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {formMode === "create" ? "Create New URL Group" : "Edit URL Group"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Display Order (Optional)"
            type="number"
            fullWidth
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
            helperText="Lower values appear first. Leave empty for automatic ordering."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleFormSubmit} color="primary" variant="contained">
            {formMode === "create" ? "Create Group" : "Save Changes"}
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
