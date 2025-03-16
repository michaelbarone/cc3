'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardActionArea,
  Avatar,
  Checkbox,
  FormControlLabel,
  Slide,
  Fade,
  useTheme
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../lib/auth/auth-context';

// Types for user tile
interface UserTile {
  id: string;
  username: string;
  avatarUrl: string | null;
  requiresPassword: boolean;
}

// Type for app config
interface AppConfig {
  appName: string;
  appLogo: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { login, register } = useAuth();
  const theme = useTheme();

  // State for users and selected user
  const [users, setUsers] = useState<UserTile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserTile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ appName: 'URL Dashboard', appLogo: null });
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState('');

  // Fetch all users for tiles and app config
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch users
        const usersResponse = await fetch('/api/auth/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);

          // Check for remembered user
          const rememberedUser = localStorage.getItem('rememberedUser');
          if (rememberedUser) {
            try {
              const userObj = JSON.parse(rememberedUser);
              // Check if the remembered user exists in our user list
              const matchingUser = usersData.find((u: UserTile) => u.id === userObj.id);
              if (matchingUser) {
                setSelectedUser(matchingUser);
                setRememberMe(true);
              }
            } catch (_) {
              // Invalid remembered user data
              localStorage.removeItem('rememberedUser');
            }
          }
        }

        // Fetch app configuration
        const configResponse = await fetch('/api/admin/app-config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setAppConfig(configData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load users or application config');
      }
    }

    fetchData();
  }, []);

  // Handle user tile selection
  const handleUserSelect = (user: UserTile) => {
    setSelectedUser(user);
    setPassword('');
    setError('');
    // Focus on password field if required
    if (user.requiresPassword && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 400); // Delay to allow animation to complete
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle registration mode
  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    setError('');
  };

  // Handle login/register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Handle login
      if (!isRegistering) {
        if (!selectedUser) {
          setError('Please select a user');
          setIsLoading(false);
          return;
        }

        try {
          await login(selectedUser.username, password);

          // Save user to localStorage if remember me is checked
          if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({
              id: selectedUser.id,
              username: selectedUser.username
            }));
          } else {
            localStorage.removeItem('rememberedUser');
          }

          // Redirect to dashboard or requested page
          router.push(redirectPath);
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message || 'Login failed');
          } else {
            setError('Login failed');
          }
        }
      }
      // Handle registration
      else {
        if (!username.trim()) {
          setError('Username is required');
          setIsLoading(false);
          return;
        }

        const result = await register(username, password);
        if (result.success) {
          router.push(redirectPath);
        } else {
          setError(result.message || 'Registration failed');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Render registration form
  const renderRegistrationForm = () => (
    <Box component="form" onSubmit={handleSubmit} width="100%">
      <Typography component="h1" variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        Create Account
      </Typography>

      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <TextField
        margin="normal"
        fullWidth
        name="password"
        label="Password (Optional)"
        type={showPassword ? 'text' : 'password'}
        id="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleTogglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2 }}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
      </Button>

      <Button
        fullWidth
        variant="text"
        onClick={handleToggleMode}
        sx={{ mt: 1 }}
      >
        Already have an account? Sign In
      </Button>
    </Box>
  );

  // Render user selection grid
  const renderUserSelection = () => (
    <Fade in={!selectedUser} timeout={500}>
      <Box width="100%">
        <Typography component="h1" variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
          Select User
        </Typography>

        <Grid container spacing={2} justifyContent="center">
          {users.map((user) => (
            <Grid item xs={6} sm={4} md={3} key={user.id}>
              <Card
                elevation={3}
                sx={{
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <CardActionArea onClick={() => handleUserSelect(user)}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    p={2}
                    sx={{ height: '120px', justifyContent: 'center' }}
                  >
                    <Avatar
                      src={user.avatarUrl || undefined}
                      alt={user.username}
                      sx={{
                        width: 56,
                        height: 56,
                        mb: 1,
                        bgcolor: user.avatarUrl ? undefined : theme.palette.primary.main
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography align="center" noWrap>
                      {user.username}
                    </Typography>
                    {user.requiresPassword && (
                      <Typography variant="caption" color="text.secondary">
                        Password protected
                      </Typography>
                    )}
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Button
          fullWidth
          variant="text"
          onClick={handleToggleMode}
          sx={{ mt: 3 }}
        >
          Don&apos;t have an account? Sign Up
        </Button>
      </Box>
    </Fade>
  );

  // Render password form for selected user
  const renderPasswordForm = () => (
    <Slide direction="up" in={!!selectedUser} mountOnEnter unmountOnExit timeout={400}>
      <Box component="form" onSubmit={handleSubmit} width="100%">
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton
            onClick={handleBackClick}
            edge="start"
            aria-label="back to user selection"
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>

          <Typography component="h1" variant="h5" sx={{ flex: 1, textAlign: 'center' }}>
            Login as {selectedUser?.username}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="center" mb={3}>
          <Avatar
            src={selectedUser?.avatarUrl || undefined}
            alt={selectedUser?.username || ''}
            sx={{
              width: 80,
              height: 80,
              bgcolor: selectedUser?.avatarUrl ? undefined : theme.palette.primary.main
            }}
          >
            {selectedUser?.username.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {selectedUser?.requiresPassword && (
          <TextField
            margin="normal"
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            inputRef={passwordInputRef}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              color="primary"
            />
          }
          label="Remember me"
          sx={{ mt: 1 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isLoading}
          sx={{ mt: 2, mb: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
      </Box>
    </Slide>
  );

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        py: 4
      }}
    >
      {/* App Branding */}
      <Box
        mb={4}
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        {appConfig.appLogo ? (
          <Box mb={2} sx={{ position: 'relative', width: 100, height: 100 }}>
            <Image
              src={`/api/admin/app-config/logo?t=${new Date().getTime()}`}
              alt={appConfig.appName}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </Box>
        ) : null}
        <Typography
          component="h1"
          variant="h4"
          fontWeight="bold"
          color="primary"
          textAlign="center"
        >
          {appConfig.appName}
        </Typography>
      </Box>

      {/* Login/Register Paper */}
      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          overflow: 'hidden',
          maxWidth: isRegistering ? 'md' : 'lg',
          transition: theme.transitions.create(['max-width']),
        }}
      >
        {isRegistering ? renderRegistrationForm() : (
          <>
            {selectedUser ? renderPasswordForm() : renderUserSelection()}
          </>
        )}
      </Paper>

      {/* Error Messages */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          elevation={6}
          variant="filled"
          severity="error"
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
