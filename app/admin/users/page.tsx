"use client";

import AvatarUpload from "@/app/components/ui/AvatarUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

      // Refresh user list
      fetchUsers();
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
                    <Chip label="Admin" color="primary" size="small" />
                  ) : (
                    <Chip label="User" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {user.passwordHash ? (
                    <Chip label="Set" color="success" size="small" />
                  ) : (
                    <Chip label="None" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
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
