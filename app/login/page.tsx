"use client";

import RestoreBackup from "@/app/components/backup/RestoreBackup";
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
  Fade,
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
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

// Default configuration object to keep code DRY
const DEFAULT_APP_CONFIG: AppConfig = {
  appName: "Dashboard",
  appLogo: null,
  loginTheme: "dark",
  registrationEnabled: false,
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get("redirect") || "/";
  const justLoggedOut = searchParams?.get("logout") === "true";
  const { login, user, loading, setUser } = useAuth();
  const theme = useTheme();
  const [isFirstRun, setIsFirstRun] = useState(false);
  // Add loading state for configuration
  const [configLoading, setConfigLoading] = useState(true);

  // State for theme configuration
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");

  // State for users and selected user
  const [users, setUsers] = useState<UserTile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserTile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    ...DEFAULT_APP_CONFIG,
    appName: "Control Center", // Override just this property for initial state
  });
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch all users for tiles and app config
  useEffect(() => {
    let isMounted = true;
    // Skip fetching if we are already logged in and being redirected
    if (!loading && user && !justLoggedOut) return;

    setConfigLoading(true);

    async function fetchData() {
      try {
        // Fetch users
        const usersResponse = await fetch("/api/auth/users", {
          // Add cache headers to prevent duplicative requests
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (!isMounted) return;

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (!isMounted) return;

          setUsers(usersData);

          // Directly use the filter here instead of creating a new variable
          const adminUsers = usersData.filter((u: UserTile) => u.isAdmin);
          const isFirstRunDetected =
            usersData.length === 1 && adminUsers.length === 1 && !adminUsers[0].lastLoginAt;

          if (isFirstRunDetected) {
            // During first run, use default config
            if (isMounted) {
              setAppConfig(DEFAULT_APP_CONFIG);
              setIsFirstRun(true);
              setConfigLoading(false);
            }
            return;
          }
        }

        // If not first run, fetch app configuration
        try {
          const configResponse = await fetch("/api/admin/app-config", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Add cache control to prevent caching issues
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          });

          if (!isMounted) return;

          if (configResponse.ok) {
            const configData = await configResponse.json();
            if (!isMounted) return;

            if (isMounted) {
              setAppConfig(configData);
              setConfigLoading(false);
            }
          } else {
            // Use default config on error
            if (isMounted) {
              setAppConfig(DEFAULT_APP_CONFIG);
              setConfigLoading(false);
            }
          }
        } catch (configError) {
          // Use default config on error
          if (isMounted) {
            setAppConfig(DEFAULT_APP_CONFIG);
            setConfigLoading(false);
          }
        }
      } catch (error) {
        // Set default config on error
        if (isMounted) {
          setAppConfig(DEFAULT_APP_CONFIG);
          setConfigLoading(false);
        }
      }
    }

    fetchData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [loading, user, justLoggedOut]);

  // Add effect to check if this is first run
  useEffect(() => {
    // Skip if we already know it's not the first run or if we're currently loading
    if (users.length > 0 || configLoading) return;

    const checkFirstRun = async () => {
      try {
        const response = await fetch("/api/auth/first-run", {
          // Add cache headers to prevent duplicative requests
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setIsFirstRun(data.isFirstRun);
        } else {
          // Default to not first run on error
          setIsFirstRun(false);
        }
      } catch (error) {
        // Default to not first run on error
        setIsFirstRun(false);
      }
    };

    checkFirstRun();
  }, [users.length, configLoading]);

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

  // Handle common login errors outside of the login function to reduce re-renders
  const handleLoginError = useMemo(
    () => (error: any) => {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Login failed");
      }
    },
    [],
  );

  // Common login function - optimized with useMemo
  const performLogin = useMemo(
    () => async (user: UserTile, pwd: string) => {
      try {
        await login(user.username, pwd);
        // Redirect to dashboard or requested page
        router.replace(redirectPath);
      } catch (error) {
        handleLoginError(error);
        throw error;
      }
    },
    [login, router, redirectPath, handleLoginError],
  );

  // Handle user tile selection - optimized with useMemo
  const handleUserSelect = useMemo(
    () => async (user: UserTile) => {
      // For passwordless users, trigger login immediately without selection state
      if (!user.requiresPassword) {
        try {
          await performLogin(user, "");
        } catch (error) {
          // Only show error if login fails
          handleLoginError(error);
        }
        return;
      }

      // For password-protected users, proceed with selection and password entry
      setSelectedUser(user);
      setPassword("");
      setError("");
      setShowPassword(false); // Reset password visibility

      // Focus on password field
      if (passwordInputRef.current) {
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 400);
      }
    },
    [performLogin, handleLoginError, passwordInputRef],
  );

  // Memoize the filtered admin users to avoid recalculation on renders
  const adminUsers = useMemo(() => users.filter((u) => u.isAdmin), [users]);

  // Memoize the detection of first run state
  const isFirstRunState = useMemo(() => {
    if (users.length === 0) return false;
    return users.length === 1 && adminUsers.length === 1 && !adminUsers[0].lastLoginAt;
  }, [users, adminUsers]);

  // Optimize the tiles per row calculation
  const calculateTilesPerRow = useMemo(
    () => () => {
      return window.innerWidth < 600 ? 1 : window.innerWidth < 960 ? 2 : 3;
    },
    [],
  );

  // Handle toggle password visibility with keyboard support
  const handleTogglePasswordVisibility = useMemo(
    () => () => {
      setShowPassword(!showPassword);
      // Return focus to password field after toggling visibility
      if (passwordInputRef.current) {
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
      }
    },
    [showPassword, passwordInputRef],
  );

  // Separate effect for theme initialization
  useEffect(() => {
    if (appConfig?.loginTheme) {
      setCurrentTheme(appConfig.loginTheme as "light" | "dark");
    }
  }, [appConfig?.loginTheme]);

  // Add keyboard ref for managing focus
  const userTilesRef = useRef<Array<HTMLDivElement | null>>([]);

  // Helper function to set reference
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    userTilesRef.current[index] = el;
  };

  // Add keyboard navigation for user tiles
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    index: number,
    user: UserTile,
  ) => {
    const tilesPerRow = calculateTilesPerRow();
    const totalUsers = users.length;

    switch (event.key) {
      case "Enter":
      case " ": // Space key
        event.preventDefault();
        handleUserSelect(user);
        break;
      case "ArrowRight": {
        event.preventDefault();
        if (index < totalUsers - 1) {
          userTilesRef.current[index + 1]?.focus();
        }
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (index > 0) {
          userTilesRef.current[index - 1]?.focus();
        }
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        const nextRowIndex = index + tilesPerRow;
        if (nextRowIndex < totalUsers) {
          userTilesRef.current[nextRowIndex]?.focus();
        }
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prevRowIndex = index - tilesPerRow;
        if (prevRowIndex >= 0) {
          userTilesRef.current[prevRowIndex]?.focus();
        }
        break;
      }
      case "Escape": {
        if (selectedUser) {
          event.preventDefault();
          setSelectedUser(null);
          setPassword("");
          setShowPassword(false);
          setError("");
          userTilesRef.current[users.findIndex((u) => u.id === selectedUser.id)]?.focus();
        }
        break;
      }
      default:
        break;
    }
  };

  // Password field keyboard navigation
  const handlePasswordKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && selectedUser) {
      event.preventDefault();
      setSelectedUser(null);
      setPassword("");
      setShowPassword(false);
      setError("");
      userTilesRef.current[users.findIndex((u) => u.id === selectedUser.id)]?.focus();
    } else if (event.key === "Enter") {
      event.preventDefault(); // Prevent default form submission behavior
      handleSubmit(event as unknown as React.FormEvent);
    }
  };

  // Login button keyboard handler
  const handleLoginButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation(); // Prevent event bubbling
      handleSubmit(event as unknown as React.FormEvent);
    }
  };

  // Handle login/register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation to prevent any parent handlers
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      // Return focus to password field on error for better keyboard experience
      if (passwordInputRef.current) {
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle backup restore completion
  const handleRestoreComplete = () => {
    // Reload the page to refresh the database state
    window.location.reload();
  };

  // Return loading indicator while configuration is loading
  if (configLoading) {
    return (
      <ThemeProvider theme={baseTheme}>
        <CssBaseline />
        <Container
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 3,
          }}
        >
          <CircularProgress size={60} color="primary" thickness={4} />
          <Typography
            variant="h6"
            color="primary"
            sx={{
              fontWeight: "medium",
              opacity: 0.9,
              textAlign: "center",
              animation: "pulse 1.5s infinite ease-in-out",
              "@keyframes pulse": {
                "0%": { opacity: 0.6 },
                "50%": { opacity: 1 },
                "100%": { opacity: 0.6 },
              },
            }}
          >
            Loading application...
          </Typography>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={baseTheme}>
      <ThemeProvider theme={loginTheme}>
        <CssBaseline />
        <Fade in={!configLoading} timeout={800}>
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
                  <Image
                    src={appConfig.appLogo}
                    alt={`${appConfig.appName} logo`}
                    fill
                    style={{
                      objectFit: "contain",
                    }}
                    priority
                    loading="eager"
                    sizes="(max-width: 100px) 100vw, 100px"
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

            {/* User Tiles Grid - Add role for better screen reader navigation */}
            <Box sx={{ width: "100%", px: 2 }} role="region" aria-label="User selection">
              <Typography component="h2" id="login-instruction" sx={{ mb: 2, textAlign: "center" }}>
                Select your user account to log in
              </Typography>
              <Grid
                container
                spacing={3}
                justifyContent="center"
                aria-labelledby="login-instruction"
              >
                {users.map((user, index) => (
                  <Grid item xs={12} sm={6} md={4} key={user.id}>
                    <Box
                      sx={{
                        position: "relative",
                        height: "250px",
                        transition: "all 0.3s ease-in-out",
                      }}
                    >
                      {/* User Tile - Add keyboard accessibility */}
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
                          "&:focus-within": {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            transform: selectedUser?.id === user.id ? "none" : "translateY(-10px)",
                          },
                        }}
                      >
                        <Box
                          ref={setRef(index)}
                          onClick={() => handleUserSelect(user)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
                            handleKeyDown(e, index, user)
                          }
                          tabIndex={0}
                          role="button"
                          aria-label={`Log in as ${user.username}${user.requiresPassword ? " - password required" : ""}`}
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
                            outline: "none", // Remove default outline
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
                            "&:focus": {
                              boxShadow: `0 0 0 3px ${theme.palette.primary.main}`,
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
                            onSubmit={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSubmit(e);
                            }}
                            aria-label={`Password form for ${user.username}`}
                            noValidate // Prevent browser validation
                            // Stop click propagation to parent
                            onClick={(e) => e.stopPropagation()}
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
                              opacity:
                                user.requiresPassword && selectedUser?.id === user.id ? 1 : 0,
                              pointerEvents:
                                user.requiresPassword && selectedUser?.id === user.id
                                  ? "auto"
                                  : "none",
                              zIndex: 2,
                            }}
                          >
                            <TextField
                              fullWidth
                              name="password"
                              label="Password"
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onKeyDown={handlePasswordKeyDown}
                              inputRef={passwordInputRef}
                              aria-invalid={!!error}
                              aria-describedby={error ? "password-error" : undefined}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent event bubbling
                                        handleTogglePasswordVisibility();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleTogglePasswordVisibility();
                                        }
                                      }}
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
                            <Button
                              type="submit"
                              variant="contained"
                              fullWidth
                              disabled={isLoading}
                              onKeyDown={handleLoginButtonKeyDown}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event from bubbling to parent
                                handleSubmit(e);
                              }}
                            >
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
              <Alert
                elevation={6}
                variant="filled"
                severity="error"
                onClose={() => setError("")}
                // Add keyboard support for alert dismissal
                tabIndex={0}
                role="alert"
                aria-live="assertive"
                sx={{
                  width: "100%",
                  "&:focus": {
                    outline: `2px solid ${theme.palette.error.main}`,
                  },
                }}
                // Add keyboard dismissal
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
                    e.preventDefault();
                    setError("");
                  }
                }}
              >
                {error}
              </Alert>
            </Snackbar>
          </Container>
        </Fade>
      </ThemeProvider>
    </ThemeProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
