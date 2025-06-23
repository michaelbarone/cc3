"use client";

import AvatarUpload from "@/app/components/ui/AvatarUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupIcon from "@mui/icons-material/Group";
import {
  Alert,
  Avatar,
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
  Switch,
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

interface User {
  id: string;
  username: string;
  passwordHash: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string | null;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"create" | "edit" | "delete">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [formValues, setFormValues] = useState({
    username: "",
    hasPassword: false,
    password: "",
    isAdmin: false,
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Groups dialog state
  const [openGroupsDialog, setOpenGroupsDialog] = useState(false);
  const [selectedUserForGroups, setSelectedUserForGroups] = useState<User | null>(null);
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Add a new state variable to track user groups
  const [userGroups, setUserGroups] = useState<Record<string, UrlGroup[]>>({});

  // Add a new state variable to track loading state for user groups
  const [loadingUserGroups, setLoadingUserGroups] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);

      // Fetch groups for all users after users are loaded
      if (data.length > 0) {
        await fetchUserGroups(data);
      }

      // Return data for chaining
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
    };

    loadData();
    // Empty dependency array to run only once on component mount
  }, []);

  const handleOpenDialog = (type: "create" | "edit" | "delete", user?: User) => {
    setDialogType(type);

    if (user) {
      setSelectedUser(user);
      setFormValues({
        username: user.username,
        hasPassword: user.passwordHash !== null,
        password: "", // Don't show existing password
        isAdmin: user.isAdmin,
      });
    } else {
      setSelectedUser(null);
      setFormValues({
        username: "",
        hasPassword: false,
        password: "",
        isAdmin: false,
      });
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = event.target;

    if (name === "hasPassword" || name === "isAdmin") {
      setFormValues((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Groups dialog functions
  const handleOpenGroupsDialog = (user: User) => {
    setSelectedUserForGroups(user);
    setOpenGroupsDialog(true);
    fetchUserGroupsForManagement(user.id);
    fetchAllGroups();
  };

  const handleCloseGroupsDialog = () => {
    setOpenGroupsDialog(false);
    setSelectedUserForGroups(null);
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

  const fetchUserGroupsForManagement = async (userId: string) => {
    try {
      setLoadingGroups(true);
      const response = await fetch(`/api/admin/users/${userId}/url-groups`);

      if (!response.ok) {
        throw new Error("Failed to fetch user groups");
      }

      const data = await response.json();
      setSelectedGroups(data.map((group: { id: string }) => group.id));
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch user groups",
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

  const handleSaveUserGroups = async () => {
    if (!selectedUserForGroups) return;

    try {
      setLoadingGroups(true);
      const response = await fetch(`/api/admin/users/${selectedUserForGroups.id}/url-groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlGroupIds: selectedGroups }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to update user groups");
      }

      // Update the userGroups state with the new selection
      const updatedGroups = urlGroups.filter((group) => selectedGroups.includes(group.id));
      setUserGroups((prev) => ({
        ...prev,
        [selectedUserForGroups.id]: updatedGroups,
      }));

      setSnackbar({
        open: true,
        message: "User groups updated successfully",
        severity: "success",
      });

      handleCloseGroupsDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to update user groups",
        severity: "error",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  // Update the fetchUserGroups function to handle loading state
  const fetchUserGroups = async (usersList: User[]) => {
    try {
      setLoadingUserGroups(true);
      // Instead of fetching groups for each user individually,
      // we'll fetch groups for users in small batches to avoid too many concurrent requests
      const userGroupsMap: Record<string, UrlGroup[]> = {};
      const batchSize = 3; // Process users in small batches

      for (let i = 0; i < usersList.length; i += batchSize) {
        const batch = usersList.slice(i, i + batchSize);

        // Create an array of promises for this batch
        const promises = batch.map((user) =>
          fetch(`/api/admin/users/${user.id}/url-groups`)
            .then((response) => {
              if (response.ok) {
                return response.json().then((groups) => {
                  userGroupsMap[user.id] = groups;
                });
              }
              return null;
            })
            .catch((err) => {
              console.error(`Error fetching groups for user ${user.id}:`, err);
              return null;
            }),
        );

        // Wait for this batch to complete before moving to the next
        await Promise.all(promises);
      }

      setUserGroups(userGroupsMap);
    } catch (err) {
      console.error("Error fetching user groups:", err);
    } finally {
      setLoadingUserGroups(false);
    }
  };

  const handleSubmit = async () => {
    try {
      let response;

      if (dialogType === "create") {
        response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formValues.username,
            password: formValues.hasPassword ? formValues.password : null,
            isAdmin: formValues.isAdmin,
          }),
        });
      } else if (dialogType === "edit" && selectedUser) {
        response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formValues.username,
            password: formValues.hasPassword ? formValues.password : null,
            isAdmin: formValues.isAdmin,
            clearPassword: !formValues.hasPassword,
          }),
        });
      } else if (dialogType === "delete" && selectedUser) {
        response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "DELETE",
        });

        // If deleting a user, remove their groups from the state
        if (selectedUser) {
          setUserGroups((prev) => {
            const updated = { ...prev };
            delete updated[selectedUser.id];
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
        message: `User ${dialogType === "create" ? "created" : dialogType === "edit" ? "updated" : "deleted"} successfully`,
        severity: "success",
      });

      // Refresh user list and their groups
      await fetchUsers();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "An unknown error occurred",
        severity: "error",
      });
    }
  };

  if (loading && users.length === 0) {
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
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog("create")}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Avatar</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Password</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Groups</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar
                    src={user.avatarUrl || undefined}
                    alt={user.username}
                    sx={{ width: 40, height: 40 }}
                  >
                    {user.username.substring(0, 2).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Chip label="Admin" color="warning" size="small" />
                  ) : (
                    <Chip label="User" color="primary" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {user.passwordHash ? (
                    <Chip label="Set" color="success" size="small" />
                  ) : (
                    <Chip label="None" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                      {loadingUserGroups ? (
                        <CircularProgress size={20} />
                      ) : userGroups[user.id]?.length > 0 ? (
                        userGroups[user.id].map((group) => (
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
                      onClick={() => handleOpenGroupsDialog(user)}
                    >
                      Manage
                    </Button>
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton aria-label="edit" onClick={() => handleOpenDialog("edit", user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    aria-label="delete"
                    onClick={() => handleOpenDialog("delete", user)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog && dialogType !== "delete"} onClose={handleCloseDialog}>
        <DialogTitle>{dialogType === "create" ? "Create New User" : "Edit User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {dialogType === "edit" && selectedUser && (
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <AvatarUpload
                  size={100}
                  editable={true}
                  adminMode={true}
                  userId={selectedUser.id}
                  initialAvatarUrl={selectedUser.avatarUrl || undefined}
                  onUploadSuccess={(avatarUrl) => {
                    setSelectedUser({ ...selectedUser, avatarUrl });
                    // Update the users list with the new avatar
                    setUsers((prevUsers) =>
                      prevUsers.map((u) => (u.id === selectedUser.id ? { ...u, avatarUrl } : u)),
                    );
                  }}
                  onUploadError={(error) => {
                    setSnackbar({
                      open: true,
                      message: error,
                      severity: "error",
                    });
                  }}
                />
              </Box>
            )}

            <TextField
              autoFocus
              margin="dense"
              name="username"
              label="Username"
              fullWidth
              variant="outlined"
              value={formValues.username}
              onChange={handleFormChange}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formValues.hasPassword}
                  onChange={handleFormChange}
                  name="hasPassword"
                />
              }
              label="Requires Password"
            />

            {formValues.hasPassword && (
              <TextField
                margin="dense"
                name="password"
                label="Password"
                type="password"
                fullWidth
                variant="outlined"
                value={formValues.password}
                onChange={handleFormChange}
              />
            )}

            <FormControlLabel
              control={
                <Switch checked={formValues.isAdmin} onChange={handleFormChange} name="isAdmin" />
              }
              label="Admin Access"
            />
          </Box>
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
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user &quot;{selectedUser?.username}&quot;? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Groups Dialog */}
      <Dialog open={openGroupsDialog} onClose={handleCloseGroupsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Manage Groups for {selectedUserForGroups?.username}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which URL groups this user should have access to
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
          <Button onClick={handleSaveUserGroups} variant="contained" disabled={loadingGroups}>
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
