'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import LogoUpload from '@/app/components/ui/LogoUpload';

interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AppConfigPage() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Fetch app configuration
  const fetchAppConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/app-config');

      if (!response.ok) {
        throw new Error('Failed to fetch app configuration');
      }

      const data = await response.json();
      setAppConfig(data);
      setAppName(data.appName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppConfig();
  }, []);

  // Handle app name change
  const handleAppNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAppName(event.target.value);
  };

  // Save app name
  const handleSaveAppName = async () => {
    if (!appName.trim()) {
      setSnackbar({
        open: true,
        message: 'App name cannot be empty',
        severity: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName })
      });

      if (!response.ok) {
        throw new Error('Failed to update app name');
      }

      const data = await response.json();
      setAppConfig(data);

      setSnackbar({
        open: true,
        message: 'App name updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle logo upload success
  const handleLogoUploadSuccess = (logoUrl: string) => {
    if (appConfig) {
      setAppConfig({
        ...appConfig,
        appLogo: logoUrl
      });
    }

    setSnackbar({
      open: true,
      message: 'App logo uploaded successfully',
      severity: 'success'
    });
  };

  // Handle logo deletion
  const handleLogoDelete = () => {
    if (appConfig) {
      setAppConfig({
        ...appConfig,
        appLogo: null
      });
    }

    setSnackbar({
      open: true,
      message: 'App logo removed successfully',
      severity: 'success'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Application Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* App Name Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Name" />
            <Divider />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The application name will be displayed in the header and browser title.
                </Typography>
                <TextField
                  fullWidth
                  label="Application Name"
                  value={appName}
                  onChange={handleAppNameChange}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleSaveAppName}
                  disabled={saving || appName === appConfig?.appName}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* App Logo Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Logo" />
            <Divider />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The application logo will be displayed in the header. If no logo is set, the application name will be shown instead.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <LogoUpload
                    logoUrl={appConfig?.appLogo || null}
                    onUploadSuccess={handleLogoUploadSuccess}
                    onUploadError={(error) => setSnackbar({
                      open: true,
                      message: error,
                      severity: 'error'
                    })}
                    onDelete={handleLogoDelete}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Section */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Preview" />
            <Divider />
            <CardContent>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1
              }}>
                {appConfig?.appLogo ? (
                  <Box
                    component="img"
                    src={appConfig.appLogo}
                    alt={appName}
                    sx={{
                      height: 40,
                      maxWidth: 160,
                      objectFit: 'contain',
                      mr: 2
                    }}
                  />
                ) : (
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {appName}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                This is how the app header will appear to users.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
