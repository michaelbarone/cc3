'use client';

import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Switch, FormControlLabel, Stack, Divider } from '@mui/material';
import { useAuth } from '@/app/lib/auth/auth-context';

export default function PasswordSettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(!!user?.hasPassword);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordEnabled && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (passwordEnabled && newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: passwordEnabled ? newPassword : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordEnabled(event.target.checked);
    if (!event.target.checked) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Password Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your account password. You can enable or disable password protection for your account.
      </Typography>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2, maxWidth: 600 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={passwordEnabled}
                  onChange={handleTogglePassword}
                  color="primary"
                />
              }
              label="Enable password protection"
            />

            <Divider />

            {user?.hasPassword && (
              <TextField
                label="Current Password"
                type="password"
                variant="outlined"
                fullWidth
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!!user?.hasPassword}
                disabled={loading}
              />
            )}

            {passwordEnabled && (
              <>
                <TextField
                  label="New Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required={passwordEnabled}
                  disabled={loading}
                  helperText="Password must be at least 8 characters"
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={passwordEnabled}
                  disabled={loading}
                />
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
