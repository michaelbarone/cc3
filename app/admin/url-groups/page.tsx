'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Grid,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface Url {
  id: string;
  title: string;
  url: string;
  iconPath: string | null;
  displayOrder: number;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  urls: Url[];
}

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export default function UrlGroupManagement() {
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'createGroup' | 'editGroup' | 'deleteGroup' | 'createUrl' | 'editUrl' | 'deleteUrl' | 'assignUsers'>('createGroup');
  const [selectedGroup, setSelectedGroup] = useState<UrlGroup | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);

  // Form state
  const [groupFormValues, setGroupFormValues] = useState({
    name: '',
    description: ''
  });

  const [urlFormValues, setUrlFormValues] = useState({
    title: '',
    url: '',
    iconPath: '',
    displayOrder: 0
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Expanded accordion state
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUrlGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/url-groups');

      if (!response.ok) {
        throw new Error('Failed to fetch URL groups');
      }

      const data = await response.json();
      setUrlGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrlGroups();
  }, []);

  const handleOpenDialog = (
    type: 'createGroup' | 'editGroup' | 'deleteGroup' | 'createUrl' | 'editUrl' | 'deleteUrl' | 'assignUsers',
    group?: UrlGroup,
    url?: Url
  ) => {
    setDialogType(type);

    if (group) {
      setSelectedGroup(group);

      if (type === 'editGroup') {
        setGroupFormValues({
          name: group.name,
          description: group.description || ''
        });
      } else if (type === 'createUrl') {
        const maxOrder = group.urls.reduce(
          (max, url) => Math.max(max, url.displayOrder),
          -1
        );

        setUrlFormValues({
          title: '',
          url: '',
          iconPath: '',
          displayOrder: maxOrder + 1
        });
      }
    } else {
      setSelectedGroup(null);

      if (type === 'createGroup') {
        setGroupFormValues({
          name: '',
          description: ''
        });
      }
    }

    if (url) {
      setSelectedUrl(url);

      if (type === 'editUrl') {
        setUrlFormValues({
          title: url.title,
          url: url.url,
          iconPath: url.iconPath || '',
          displayOrder: url.displayOrder
        });
      }
    } else {
      setSelectedUrl(null);
    }

    if (type === 'assignUsers' && group) {
      fetchUsers();
      fetchAssignedUsers(group.id);
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleGroupFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setGroupFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleUrlFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setUrlFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleUrlOrderChange = async (
    groupId: string,
    urlId: string,
    direction: 'up' | 'down'
  ) => {
    try {
      const response = await fetch(`/api/admin/url-groups/${groupId}/urls/${urlId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Operation failed');
      }

      fetchUrlGroups();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        severity: 'error'
      });
    }
  };

  const handleSubmit = async () => {
    try {
      let response;
      let successMessage = '';

      // Handle group operations
      if (dialogType === 'createGroup') {
        response = await fetch('/api/admin/url-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupFormValues)
        });
        successMessage = 'URL group created successfully';
      } else if (dialogType === 'editGroup' && selectedGroup) {
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupFormValues)
        });
        successMessage = 'URL group updated successfully';
      } else if (dialogType === 'deleteGroup' && selectedGroup) {
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}`, {
          method: 'DELETE'
        });
        successMessage = 'URL group deleted successfully';
      }

      // Handle URL operations
      else if (dialogType === 'createUrl' && selectedGroup) {
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(urlFormValues)
        });
        successMessage = 'URL created successfully';
      } else if (dialogType === 'editUrl' && selectedGroup && selectedUrl) {
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls/${selectedUrl.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(urlFormValues)
        });
        successMessage = 'URL updated successfully';
      } else if (dialogType === 'deleteUrl' && selectedGroup && selectedUrl) {
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls/${selectedUrl.id}`, {
          method: 'DELETE'
        });
        successMessage = 'URL deleted successfully';
      }

      if (!response?.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.error || 'Operation failed');
      }

      // Show success message
      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success'
      });

      // Refresh data
      fetchUrlGroups();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        severity: 'error'
      });
    }
  };

  const handleAccordionChange = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  // Fetch users for the assignment dialog
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch users',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch users assigned to a URL group
  const fetchAssignedUsers = async (groupId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/admin/url-groups/${groupId}/users`);

      if (!response.ok) {
        throw new Error('Failed to fetch assigned users');
      }

      const data = await response.json();
      setSelectedUsers(data.users.map((user: User) => user.id));
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch assigned users',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle user selection for URL group assignments
  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle saving user assignments to a URL group
  const handleSaveUserAssignments = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to save user assignments');
      }

      setSnackbar({
        open: true,
        message: 'User assignments saved successfully',
        severity: 'success'
      });

      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save user assignments',
        severity: 'error'
      });
    }
  };

  if (loading && urlGroups.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">URL Group Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('createGroup')}
        >
          Add URL Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {urlGroups.length === 0 && !loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No URL groups found. Create your first group to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {urlGroups.map((group) => (
            <Grid item xs={12} key={group.id}>
              <Accordion
                expanded={expandedGroupId === group.id}
                onChange={() => handleAccordionChange(group.id)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${group.id}-content`}
                  id={`panel-${group.id}-header`}
                >
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">{group.name}</Typography>
                    <Box>
                      <Tooltip title="Edit Group">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog('editGroup', group);
                          }}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Group">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog('deleteGroup', group);
                          }}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Assign to Users">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog('assignUsers', group);
                          }}
                          size="small"
                          color="primary"
                        >
                          <GroupIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {group.description || 'No description provided'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog('createUrl', group)}
                      size="small"
                    >
                      Add URL
                    </Button>
                  </Box>

                  <List sx={{ width: '100%' }}>
                    {group.urls.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="No URLs in this group" />
                      </ListItem>
                    ) : (
                      group.urls
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((url, index) => (
                          <Box key={url.id}>
                            <ListItem>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ mr: 1 }}>
                                      {url.iconPath ? (
                                        <img
                                          src={url.iconPath}
                                          alt={url.title}
                                          width={16}
                                          height={16}
                                        />
                                      ) : (
                                        <LinkIcon fontSize="small" />
                                      )}
                                    </Box>
                                    {url.title}
                                  </Box>
                                }
                                secondary={url.url}
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title="Move Up">
                                  <span>
                                    <IconButton
                                      edge="end"
                                      aria-label="move up"
                                      onClick={() => handleUrlOrderChange(group.id, url.id, 'up')}
                                      disabled={index === 0}
                                      size="small"
                                    >
                                      <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Move Down">
                                  <span>
                                    <IconButton
                                      edge="end"
                                      aria-label="move down"
                                      onClick={() => handleUrlOrderChange(group.id, url.id, 'down')}
                                      disabled={index === group.urls.length - 1}
                                      size="small"
                                    >
                                      <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Preview URL">
                                  <IconButton
                                    edge="end"
                                    aria-label="preview"
                                    onClick={() => window.open(url.url, '_blank')}
                                    size="small"
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit URL">
                                  <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => handleOpenDialog('editUrl', group, url)}
                                    size="small"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete URL">
                                  <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleOpenDialog('deleteUrl', group, url)}
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                            {index < group.urls.length - 1 && <Divider component="li" />}
                          </Box>
                        ))
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Group Dialogs */}
      <Dialog
        open={openDialog && (dialogType === 'createGroup' || dialogType === 'editGroup')}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogType === 'createGroup' ? 'Create New URL Group' : 'Edit URL Group'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupFormValues.name}
            onChange={handleGroupFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={groupFormValues.description}
            onChange={handleGroupFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === 'createGroup' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Dialogs */}
      <Dialog
        open={openDialog && (dialogType === 'createUrl' || dialogType === 'editUrl')}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogType === 'createUrl' ? 'Add New URL' : 'Edit URL'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Title"
            fullWidth
            variant="outlined"
            value={urlFormValues.title}
            onChange={handleUrlFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="url"
            label="URL"
            fullWidth
            variant="outlined"
            value={urlFormValues.url}
            onChange={handleUrlFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="iconPath"
            label="Icon Path (optional)"
            fullWidth
            variant="outlined"
            value={urlFormValues.iconPath}
            onChange={handleUrlFormChange}
            helperText="Path to the icon image file (leave empty for default icon)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === 'createUrl' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <Dialog
        open={openDialog && (dialogType === 'deleteGroup' || dialogType === 'deleteUrl')}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogType === 'deleteGroup' ? 'Delete URL Group' : 'Delete URL'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogType === 'deleteGroup'
              ? `Are you sure you want to delete the URL group "${selectedGroup?.name}"? This will also delete all URLs within this group and remove it from all users.`
              : `Are you sure you want to delete the URL "${selectedUrl?.title}"?`}
            <br /><br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Assignment Dialog - Replace the existing placeholder */}
      <Dialog
        open={openDialog && dialogType === 'assignUsers'}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Assign Users to {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which users should have access to this URL group
          </Typography>

          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : users.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
              No users found
            </Typography>
          ) : (
            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {users.map(user => (
                <ListItem key={user.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                      />
                    }
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1">{user.username}</Typography>
                        {user.isAdmin && (
                          <Chip
                            label="Admin"
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveUserAssignments}
            variant="contained"
            disabled={loadingUsers}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
