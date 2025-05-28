"use client";

import { generateAvatarColor, getUserInitials } from "@/app/utils/userUtils";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
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
  FormControl,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

// Types
type User = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type FormData = {
  name: string;
  role: string;
  isActive: boolean;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [dialogStep, setDialogStep] = useState<"form" | "confirm">("form");
  const [formData, setFormData] = useState<FormData>({ name: "", role: "USER", isActive: true });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [validationError, setValidationError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [userCreationAllowed, setUserCreationAllowed] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchSystemSettings();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      showSnackbar("Error loading users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setUserCreationAllowed(data.settings?.allowAdminUserCreation !== "false");
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name.trim()) {
      setValidationError("Username is required");
      return;
    }

    if (formData.name.trim().length < 3) {
      setValidationError("Username must be at least 3 characters");
      return;
    }

    setValidationError("");
    setDialogStep("confirm");
  };

  const confirmCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name.trim(), role: formData.role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      showSnackbar("User created successfully", "success");
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error creating user:", error);
      showSnackbar(error instanceof Error ? error.message : "Failed to create user", "error");
      setDialogStep("form");
    }
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!currentUser) return;
    setDialogStep("confirm");
  };

  const confirmUpdateUser = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      showSnackbar("User updated successfully", "success");
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error updating user:", error);
      showSnackbar(error instanceof Error ? error.message : "Failed to update user", "error");
      setDialogStep("form");
    }
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setConfirmDialogOpen(false);
    setCurrentUser(null);
    setFormData({ name: "", role: "USER", isActive: true });
    setDialogStep("form");
    setValidationError("");
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Only show the rows for the current page
  const paginatedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        {userCreationAllowed && (
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create New User
          </Button>
        )}
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
                <TableCell>Avatar</TableCell>
                <TableCell>Login Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar
                      src={user.avatarUrl || undefined}
                      alt={user.name}
                      sx={{
                        bgcolor: user.avatarUrl ? undefined : generateAvatarColor(user.name),
                      }}
                    >
                      {!user.avatarUrl && getUserInitials(user.name)}
                    </Avatar>
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? "Active" : "Disabled"}
                      color={user.isActive ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), "MMM d, yyyy h:mm a")
                      : "Never"}
                  </TableCell>
                  <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditUser(user)} size="small">
                      <EditIcon />
                    </IconButton>
                    <Tooltip title="User deletion feature to be implemented post-MVP">
                      <span>
                        <IconButton color="error" disabled size="small">
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={users.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => dialogStep === "form" && handleCloseDialog()}
        maxWidth="sm"
        fullWidth
      >
        {dialogStep === "form" ? (
          <>
            <DialogTitle>Create New User</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Username"
                type="text"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!validationError}
                helperText={validationError}
              />
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Role</Typography>
                <RadioGroup
                  row
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <FormControlLabel value="USER" control={<Radio />} label="User" />
                  <FormControlLabel value="ADMIN" control={<Radio />} label="Admin" />
                </RadioGroup>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleCreateUser} color="primary">
                Next
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>Confirm User Creation</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to create a new user with name &apos;{formData.name}&apos; and
                role &apos;{formData.role}&apos;? They will log in without a password initially and
                will need to set their own.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogStep("form")}>Back</Button>
              <Button onClick={confirmCreateUser} color="primary">
                Create User
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => dialogStep === "form" && handleCloseDialog()}
        maxWidth="sm"
        fullWidth
      >
        {dialogStep === "form" ? (
          <>
            <DialogTitle>Edit User</DialogTitle>
            <DialogContent>
              <TextField
                margin="dense"
                label="Username"
                type="text"
                fullWidth
                value={formData.name}
                disabled
              />
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Role</Typography>
                <RadioGroup
                  row
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <FormControlLabel value="USER" control={<Radio />} label="User" />
                  <FormControlLabel value="ADMIN" control={<Radio />} label="Admin" />
                </RadioGroup>
              </FormControl>
              <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ mr: 2 }}>
                  Account Active
                </Typography>
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  color="success"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleUpdateUser} color="primary">
                Next
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>Confirm User Update</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to save these changes for user &apos;{currentUser?.name}
                &apos;?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogStep("form")}>Back</Button>
              <Button onClick={confirmUpdateUser} color="primary">
                Save Changes
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
