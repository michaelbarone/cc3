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
  CardHeader,
  FormControlLabel,
  Switch
} from '@mui/material';
import LogoUpload from '@/app/components/ui/LogoUpload';
import FaviconUpload from '@/app/components/ui/FaviconUpload';

interface AppConfig {
  id: string;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AppConfigPage() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  const [loginTheme, setLoginTheme] = useState('dark');
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

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
      setLoginTheme(data.loginTheme || 'dark');
      setRegistrationEnabled(data.registrationEnabled || false);
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

  // Handle login theme change
  const handleLoginThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoginTheme(event.target.value);
  };

  // Save login theme
  const handleSaveLoginTheme = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/app-config/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginTheme })
      });

      if (!response.ok) {
        throw new Error('Failed to update login theme');
      }

      const data = await response.json();
      setAppConfig(data);

      setSnackbar({
        open: true,
        message: 'Login theme updated successfully',
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

  // Handle registration enabled change
  const handleRegistrationEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrationEnabled(event.target.checked);
  };

  // Save registration enabled setting
  const handleSaveRegistrationEnabled = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/app-config/registration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationEnabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update registration settings');
      }

      const data = await response.json();
      setAppConfig(data);

      setSnackbar({
        open: true,
        message: 'Registration settings updated successfully',
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
        {/* App Branding Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Branding" />
            <Divider />
            <CardContent>
              {/* App Name Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Application Name
                </Typography>
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

              <Divider sx={{ my: 3 }} />

              {/* App Logo Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Application Logo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The application logo will be displayed in the header. If no logo is set, the application name will be shown instead.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
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
                {/* Theme Previews for Logo */}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Light Theme Preview */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: '#ffffff',
                        color: '#000000',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 48,
                          flex: 1,
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
                              }}
                            />
                          ) : (
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {appName}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption">
                          Light Theme
                        </Typography>
                      </Box>
                    </Box>
                    {/* Dark Theme Preview */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: '#121212',
                        color: '#ffffff',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 48,
                          flex: 1,
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
                              }}
                            />
                          ) : (
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {appName}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'inherit' }}>
                          Dark Theme
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Favicon Section */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Browser Favicon
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The browser favicon will be displayed in browser tabs and bookmarks.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <FaviconUpload
                    faviconUrl={appConfig?.favicon || null}
                    onUploadSuccess={(favicon) => {
                      if (appConfig) {
                        setAppConfig({
                          ...appConfig,
                          favicon
                        });
                      }
                      setSnackbar({
                        open: true,
                        message: 'Favicon uploaded successfully',
                        severity: 'success'
                      });
                    }}
                    onUploadError={(error) => setSnackbar({
                      open: true,
                      message: error,
                      severity: 'error'
                    })}
                    onDelete={() => {
                      if (appConfig) {
                        setAppConfig({
                          ...appConfig,
                          favicon: null
                        });
                      }
                      setSnackbar({
                        open: true,
                        message: 'Favicon removed successfully',
                        severity: 'success'
                      });
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Login Theme Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Login Page Theme" />
            <Divider />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose the theme for the login page. This affects the appearance of the login page only.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      id="theme-light"
                      name="loginTheme"
                      value="light"
                      checked={loginTheme === 'light'}
                      onChange={handleLoginThemeChange}
                      style={{ marginRight: 1 }}
                    />
                    <Box
                      component="label"
                      htmlFor="theme-light"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        ml: 1,
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#ffffff',
                        color: '#000000',
                        width: '100%',
                        cursor: 'pointer'
                      }}
                    >
                      <Typography>Light Theme</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="radio"
                      id="theme-dark"
                      name="loginTheme"
                      value="dark"
                      checked={loginTheme === 'dark'}
                      onChange={handleLoginThemeChange}
                      style={{ marginRight: 1 }}
                    />
                    <Box
                      component="label"
                      htmlFor="theme-dark"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        ml: 1,
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#121212',
                        color: '#ffffff',
                        width: '100%',
                        cursor: 'pointer'
                      }}
                    >
                      <Typography>Dark Theme</Typography>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleSaveLoginTheme}
                  disabled={saving || loginTheme === appConfig?.loginTheme}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Registration" />
            <Divider />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enable or disable self-registration for new users. When disabled, only administrators can create new user accounts.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={registrationEnabled}
                        onChange={handleRegistrationEnabledChange}
                        color="primary"
                      />
                    }
                    label="Allow user self-registration"
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={handleSaveRegistrationEnabled}
                  disabled={saving || registrationEnabled === appConfig?.registrationEnabled}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Box>
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
