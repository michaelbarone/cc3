"use client";

import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  CssBaseline,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth/auth-context";

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
  loginTheme: string;
  registrationEnabled: boolean;
}

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const justLoggedOut = searchParams.get("logout") === "true";
  const { login } = useAuth();
  const theme = useTheme();

  // State for theme configuration
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");

  // State for users and selected user
  const [users, setUsers] = useState<UserTile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserTile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    appName: "Control Center",
    appLogo: null,
    loginTheme: "dark",
    registrationEnabled: false,
  });
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectedUser) {
        const target = event.target as HTMLElement;
        const isClickInsideCard = target.closest(`[data-user-id="${selectedUser.id}"]`);
        if (!isClickInsideCard) {
          setSelectedUser(null);
          setPassword("");
          setShowPassword(false);
          setError("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedUser]);

  // UI state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Create base theme that matches the server-side default
  const baseTheme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#90caf9" },
      background: { default: "#121212", paper: "#1e1e1e" },
    },
  });

  // Create a custom theme for the login page based on the app config
  const loginTheme = useMemo(() => {
    if (currentTheme === "light") {
      return createTheme({
        palette: {
          mode: "light",
          primary: { main: "#1976d2" },
          background: { default: "#f5f5f5", paper: "#ffffff" },
        },
      });
    }
    return baseTheme;
  }, [currentTheme]);

  // Fetch all users for tiles and app config
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch users
        const usersResponse = await fetch("/api/auth/users");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);

          // Check for remembered user, but only if not just logged out
          if (!justLoggedOut) {
            const rememberedUser = localStorage.getItem("rememberedUser");
            if (rememberedUser) {
              try {
                const userObj = JSON.parse(rememberedUser);
                // Check if the remembered user exists in our user list
                const matchingUser = usersData.find((u: UserTile) => u.id === userObj.id);
                if (matchingUser) {
                  setSelectedUser(matchingUser);
                  setRememberMe(true);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (_) {
                // Invalid remembered user data
                localStorage.removeItem("rememberedUser");
              }
            }
          }
        }

        // Fetch app configuration
        const configResponse = await fetch("/api/admin/app-config");
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setAppConfig(configData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // setError('Failed to load users or application config');
      }
    }

    fetchData();
  }, [justLoggedOut]);

  // Separate effect for theme initialization
  useEffect(() => {
    if (appConfig?.loginTheme) {
      setCurrentTheme(appConfig.loginTheme as "light" | "dark");
    }
  }, [appConfig?.loginTheme]);

  // Handle login/register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!selectedUser) {
        setError("Please select a user");
        setIsLoading(false);
        return;
      }

      await performLogin(selectedUser, password, rememberMe);
    } catch (err) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Common login function
  const performLogin = async (user: UserTile, pwd: string, remember: boolean) => {
    try {
      await login(user.username, pwd);

      // Save user to localStorage if remember me is checked
      if (remember) {
        localStorage.setItem(
          "rememberedUser",
          JSON.stringify({
            id: user.id,
            username: user.username,
          }),
        );
      } else {
        localStorage.removeItem("rememberedUser");
      }

      // Redirect to dashboard or requested page
      router.push(redirectPath);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "Login failed");
      } else {
        setError("Login failed");
      }
      throw error; // Rethrow to be caught by calling function
    }
  };

  // Handle user tile selection
  const handleUserSelect = async (user: UserTile) => {
    setSelectedUser(user);
    setPassword("");
    setError("");

    // If user doesn't require a password, log them in automatically
    if (!user.requiresPassword) {
      setIsLoading(true);
      setRememberMe(true); // Auto set remember me for passwordless users

      try {
        await performLogin(user, "", true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Error is already set in performLogin
        setIsLoading(false);
      }
      return;
    }

    // Focus on password field if required
    if (user.requiresPassword && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 400); // Delay to allow animation to complete
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ThemeProvider theme={loginTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* App Logo */}
          {appConfig.appLogo ? (
            <img
              src={appConfig.appLogo}
              alt={`${appConfig.appName} Logo`}
              style={{ width: "64px", height: "64px", marginBottom: "1rem" }}
            />
          ) : (
            <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
              {/* You can add a default icon here */}
            </Avatar>
          )}

          <Typography component="h1" variant="h5">
            {appConfig.appName}
          </Typography>

          {/* User Selection Grid */}
          {!selectedUser && (
            <Grid container spacing={2} sx={{ mt: 3 }}>
              {users.map((user) => (
                <Grid item xs={6} key={user.id}>
                  <Card
                    data-user-id={user.id}
                    onClick={() => handleUserSelect(user)}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      transition: "transform 0.2s",
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    <Avatar src={user.avatarUrl || undefined} sx={{ width: 56, height: 56, mb: 1 }}>
                      {user.username[0].toUpperCase()}
                    </Avatar>
                    <Typography variant="subtitle1" align="center">
                      {user.username}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Login Form */}
          {selectedUser && (
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
              sx={{
                mt: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
              data-user-id={selectedUser.id}
            >
              <Avatar
                src={selectedUser.avatarUrl || undefined}
                sx={{ width: 64, height: 64, mb: 2 }}
              >
                {selectedUser.username[0].toUpperCase()}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {selectedUser.username}
              </Typography>

              {selectedUser.requiresPassword && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={!!error}
                  helperText={error}
                  inputRef={passwordInputRef}
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
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading || (selectedUser.requiresPassword && !password)}
              >
                {isLoading ? <CircularProgress size={24} /> : "Sign In"}
              </Button>

              {/* Remember Me Checkbox */}
              {selectedUser.requiresPassword && (
                <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-start" }}>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ marginRight: "8px" }}
                    />
                    Remember me
                  </label>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Notification for successful logout */}
        <Snackbar
          open={justLoggedOut}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" sx={{ width: "100%" }}>
            Successfully logged out
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}
