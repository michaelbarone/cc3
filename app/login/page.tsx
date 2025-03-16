'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../lib/auth/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { login, register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      setIsLoading(false);
      return;
    }

    try {
      // Handle login
      if (!isRegistering) {
        const result = await login(username, password);
        if (result.success) {
          router.push(redirectPath);
        } else {
          if (result.requiresPassword) {
            setRequiresPassword(true);
          }
          setError(result.message || 'Login failed');
        }
      }
      // Handle registration
      else {
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

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          {isRegistering ? 'Create Account' : 'Sign In'}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} width="100%">
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

          {/* Show password field if registering or if user has password set */}
          {(isRegistering || requiresPassword) && (
            <TextField
              margin="normal"
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : isRegistering ? (
              'Sign Up'
            ) : (
              'Sign In'
            )}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={handleToggleMode}
            sx={{ mt: 1 }}
          >
            {isRegistering
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
