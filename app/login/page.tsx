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
import RestoreBackup from "../components/backup/RestoreBackup";
import { useAuth } from "../lib/auth/auth-context";

// Types for user tile
interface UserTile {
  id: string;
  username: string;
  avatarUrl: string | null;
  requiresPassword: boolean;
  isAdmin: boolean;
  lastLoginAt?: string;
}

// Type for app config
interface AppConfig {
  appName: string;
  appLogo: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const justLoggedOut = searchParams.get("logout") === "true";
  const { login, user, loading, setUser } = useAuth();
  const theme = useTheme();
  const [isFirstRun, setIsFirstRun] = useState(false);

  // Add effect to handle redirect for authenticated users
  useEffect(() => {
    if (!loading && user) {
      // Only redirect if user is logged in and not coming from a logout action
      if (!justLoggedOut) {
        router.replace(redirectPath);
      } else {
        // If user was logged out but somehow still has user data, clear it
        setUser(null);
      }
    }
  }, [loading, user, justLoggedOut, router, redirectPath, setUser]);

  // Add effect to check if this is first run
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const response = await fetch("/api/auth/first-run");
        if (response.ok) {
          const data = await response.json();
          setIsFirstRun(data.isFirstRun);
        }
      } catch (error) {
        console.error("Failed to check first run status:", error);
      }
    };

    checkFirstRun();
  }, []);

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

          // Check if we're in first run (exactly one admin user who has never logged in)
          const adminUsers = usersData.filter((u: UserTile) => u.isAdmin);
          const isFirstRun =
            usersData.length === 1 && adminUsers.length === 1 && !adminUsers[0].lastLoginAt;

          if (isFirstRun) {
            // During first run, use default config
            setAppConfig({
              appName: "Dashboard",
              appLogo: null,
              loginTheme: "light",
              registrationEnabled: false,
            });
            return;
          }
        }

        // If not first run, fetch app configuration
        const configResponse = await fetch("/api/admin/app-config");
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setAppConfig(configData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Set default config on error
        setAppConfig({
          appName: "Dashboard",
          appLogo: null,
          loginTheme: "dark",
          registrationEnabled: false,
        });
      }
    }

    fetchData();
  }, []);

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

      await performLogin(selectedUser, password);
    } catch (err) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Common login function
  const performLogin = async (user: UserTile, pwd: string) => {
    try {
      await login(user.username, pwd);
      // Redirect to dashboard or requested page
      router.push(redirectPath);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "Login failed");
      } else {
        setError("Login failed");
      }
      throw error;
    }
  };

  // Handle user tile selection
  const handleUserSelect = async (user: UserTile) => {
    // For passwordless users, trigger login immediately without selection state
    if (!user.requiresPassword) {
      try {
        await performLogin(user, "");
      } catch (error) {
        // Only show error if login fails
        if (error instanceof Error) {
          setError(error.message || "Login failed");
        } else {
          setError("Login failed");
        }
      }
      return;
    }

    // For password-protected users, proceed with selection and password entry
    setSelectedUser(user);
    setPassword("");
    setError("");

    // Focus on password field
    if (passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 400);
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle backup restore completion
  const handleRestoreComplete = () => {
    // Reload the page to refresh the database state
    window.location.reload();
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <ThemeProvider theme={loginTheme}>
        <CssBaseline />
        <Container
          component="main"
          maxWidth="md"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: "100vh",
            py: 8,
          }}
        >
          {/* App Branding */}
          <Box
            role="banner"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 6,
            }}
          >
            {appConfig.appLogo ? (
              <Box
                sx={{
                  position: "relative",
                  width: 100,
                  height: 100,
                  mb: 2,
                }}
              >
                <img
                  src={appConfig.appLogo}
                  alt={`${appConfig.appName} logo`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
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

          {/* User Tiles Grid */}
          <Box sx={{ width: "100%", px: 2 }}>
            <Typography component="h2" id="login-instruction" sx={{ mb: 2, textAlign: "center" }}>
              Select your user account to log in
            </Typography>
            <Grid container spacing={3} justifyContent="center" aria-labelledby="login-instruction">
              {users.map((user) => (
                <Grid item xs={12} sm={6} md={4} key={user.id}>
                  <Box
                    sx={{
                      position: "relative",
                      height: "250px",
                      transition: "all 0.3s ease-in-out",
                    }}
                  >
                    {/* User Tile */}
                    <Card
                      elevation={3}
                      data-user-id={user.id}
                      sx={{
                        height: "250px",
                        position: "absolute",
                        width: "100%",
                        overflow: "hidden",
                        bgcolor: "background.paper",
                        borderRadius: 3,
                        transition: "all 0.3s ease-in-out",
                        "&:hover": {
                          transform: selectedUser?.id === user.id ? "none" : "translateY(-10px)",
                        },
                      }}
                    >
                      <Box
                        onClick={() => handleUserSelect(user)}
                        sx={{
                          height: "100%",
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          position: "relative",
                          transition: "all 0.3s ease-in-out",
                          transform: "none",
                          cursor: "pointer",
                          ...(user.avatarUrl && {
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: `url(${user.avatarUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              zIndex: 0,
                            },
                          }),
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: user.avatarUrl
                              ? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 100%)"
                              : `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                            opacity: user.avatarUrl ? 1 : 0.2,
                            zIndex: 1,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: selectedUser?.id === user.id ? "5%" : "50%",
                            left: 0,
                            right: 0,
                            transform: selectedUser?.id === user.id ? "none" : "translateY(-50%)",
                            transition: "all 0.3s ease-in-out",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: "100%",
                            zIndex: 1,
                            padding: selectedUser?.id === user.id ? "1rem" : 2,
                          }}
                        >
                          {!user.avatarUrl && (
                            <Avatar
                              src={user.avatarUrl || undefined}
                              alt={user.username}
                              sx={{
                                width: selectedUser?.id === user.id ? 0 : 100,
                                height: selectedUser?.id === user.id ? 0 : 100,
                                mb: 2,
                                transition: "all 0.3s ease-in-out",
                                border: "4px solid",
                                borderColor: "background.paper",
                                bgcolor: theme.palette.primary.main,
                                boxShadow: 3,
                                opacity: selectedUser?.id === user.id ? 0 : 1,
                                transform: selectedUser?.id === user.id ? "scale(0)" : "scale(1)",
                                position: "relative",
                              }}
                            >
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                          <Typography
                            variant="h6"
                            align="center"
                            sx={{
                              color: "white",
                              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                              fontWeight: "bold",
                              mb: selectedUser?.id === user.id ? 0 : 1,
                              fontSize: selectedUser?.id === user.id ? "1.1rem" : "1.25rem",
                              transition: "all 0.3s ease-in-out",
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            {user.username}
                          </Typography>
                          {user.requiresPassword && !selectedUser && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.primary.light,
                                fontWeight: "bold",
                                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                                backdropFilter: "blur(4px)",
                                px: 2,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: "rgba(0,0,0,0.3)",
                              }}
                            >
                              Account Locked
                            </Typography>
                          )}
                        </Box>

                        {/* Password Form - Inside the card */}
                        <Box
                          component="form"
                          onSubmit={handleSubmit}
                          aria-label={`Password form for ${selectedUser?.username}`}
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 3,
                            background: "rgba(0,0,0,0.3)",
                            backdropFilter: "blur(10px)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
                            transform:
                              user.requiresPassword && selectedUser?.id === user.id
                                ? "translateY(0)"
                                : "translateY(100%)",
                            opacity: user.requiresPassword && selectedUser?.id === user.id ? 1 : 0,
                            pointerEvents:
                              user.requiresPassword && selectedUser?.id === user.id
                                ? "auto"
                                : "none",
                            zIndex: 2,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TextField
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            inputRef={passwordInputRef}
                            aria-invalid={!!error}
                            aria-describedby={error ? "password-error" : undefined}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={handleTogglePasswordVisibility}
                                    edge="end"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    sx={{ color: "white" }}
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& .MuiInputLabel-root": {
                                color: "white",
                                transition: "all 0.3s ease-in-out",
                              },
                              "& .MuiInputBase-root": {
                                color: "white",
                                transition: "all 0.3s ease-in-out",
                                "&:before": {
                                  borderColor: "rgba(255,255,255,0.5)",
                                  transition: "all 0.3s ease-in-out",
                                },
                                "&:hover:not(.Mui-disabled):before": {
                                  borderColor: "rgba(255,255,255,0.7)",
                                },
                                "& .MuiInputAdornment-root": {
                                  "& .MuiIconButton-root": {
                                    transition: "all 0.3s ease-in-out",
                                  },
                                },
                              },
                            }}
                          />
                          <Button type="submit" variant="contained" fullWidth disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : "Log In"}
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Add RestoreBackup component */}
            {isFirstRun && <RestoreBackup onRestoreComplete={handleRestoreComplete} />}
          </Box>

          {/* Error Messages */}
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError("")}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert elevation={6} variant="filled" severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          </Snackbar>
        </Container>
      </ThemeProvider>
    </ThemeProvider>
  );
}
