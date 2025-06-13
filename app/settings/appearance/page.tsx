"use client";

import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { ThemeContext } from "@/app/theme/theme-provider";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import React, { useContext, useState } from "react";

export default function AppearanceSettingsPage() {
  const { preferences, isLoading: loading, updatePreferences } = useUserPreferences();
  const themeContext = useContext(ThemeContext);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Handle menu position change
  const handleMenuPositionChange = async (
    event: React.ChangeEvent<HTMLInputElement> | { target: { value: string } },
  ) => {
    const newPosition = event.target.value as "side" | "top";

    try {
      await updatePreferences({ menuPosition: newPosition });
      setNotification({
        open: true,
        message:
          "Dashboard menu position updated successfully. Changes will take effect immediately.",
        severity: "success",
      });
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to update menu position: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
      });
    }
  };

  // Handle theme mode change
  const handleThemeModeChange = async (
    event: React.ChangeEvent<HTMLInputElement> | { target: { value: string } },
  ) => {
    const newMode = event.target.value as "light" | "dark";

    // Don't update if it's already the current mode
    if (preferences.theme === newMode) {
      console.log("Theme mode already set to", newMode);
      return;
    }

    console.log(`Changing theme mode from ${preferences.theme} to ${newMode}`);

    try {
      // First update the database preference
      await updatePreferences({ theme: newMode });

      // Then toggle the theme in the UI via ThemeContext
      // Only toggle if needed (current mode is different from target)
      if (themeContext && themeContext.mode !== newMode) {
        themeContext.toggleColorMode();
      }

      setNotification({
        open: true,
        message: "Theme mode updated successfully. This change will persist between sessions.",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating theme:", error);
      setNotification({
        open: true,
        message: `Failed to update theme mode: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
      });
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Appearance Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Customize the appearance of the application
      </Typography>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            width: "100%",
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading user preferences...</Typography>
        </Box>
      ) : (
        <>
          {/* Theme Settings */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2, maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>
              Theme
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box>
              <Typography variant="body1" paragraph>
                Choose your preferred theme mode.
              </Typography>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
                      bgcolor: "background.paper",
                      color: "text.primary",
                      border:
                        preferences.theme === "light" ? "2px solid #1976d2" : "1px solid #e0e0e0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: preferences.theme === "light" ? "scale(1.02)" : "scale(1)",
                      "&:hover": { borderColor: "#1976d2", transform: "scale(1.02)" },
                    }}
                    onClick={() =>
                      handleThemeModeChange({
                        target: { value: "light" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <LightModeIcon color="warning" />
                      <Typography variant="subtitle1">Light Mode</Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#fff",
                        color: "#333",
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        height: 100,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{
                          height: 20,
                          width: "70%",
                          bgcolor: "#f5f5f5",
                          mb: 1,
                          borderRadius: 0.5,
                        }}
                      ></Box>
                      <Box
                        sx={{
                          height: 10,
                          width: "90%",
                          bgcolor: "#eaeaea",
                          mb: 1,
                          borderRadius: 0.5,
                        }}
                      ></Box>
                      <Box
                        sx={{ height: 10, width: "80%", bgcolor: "#eaeaea", borderRadius: 0.5 }}
                      ></Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
                      bgcolor: "#333",
                      color: "#fff",
                      border: preferences.theme === "dark" ? "2px solid #1976d2" : "1px solid #333",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: preferences.theme === "dark" ? "scale(1.02)" : "scale(1)",
                      "&:hover": { borderColor: "#1976d2", transform: "scale(1.02)" },
                    }}
                    onClick={() =>
                      handleThemeModeChange({
                        target: { value: "dark" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <DarkModeIcon color="primary" />
                      <Typography variant="subtitle1">Dark Mode</Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#222",
                        color: "#fff",
                        border: "1px solid #444",
                        borderRadius: 1,
                        height: 100,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{
                          height: 20,
                          width: "70%",
                          bgcolor: "#444",
                          mb: 1,
                          borderRadius: 0.5,
                        }}
                      ></Box>
                      <Box
                        sx={{
                          height: 10,
                          width: "90%",
                          bgcolor: "#555",
                          mb: 1,
                          borderRadius: 0.5,
                        }}
                      ></Box>
                      <Box
                        sx={{ height: 10, width: "80%", bgcolor: "#555", borderRadius: 0.5 }}
                      ></Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                Your current theme:{" "}
                <strong>{preferences.theme === "light" ? "Light Mode" : "Dark Mode"}</strong>
              </Typography>
            </Box>
          </Paper>

          {/* Menu Position Settings */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2, maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>
              Dashboard Menu Position
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box>
              <Typography variant="body1" paragraph>
                Choose where you want the menu to appear in the dashboard.
                <strong> This setting only affects the dashboard view.</strong> The settings area
                will always show the menu on the left side.
              </Typography>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
                      bgcolor: "background.paper",
                      color: "text.primary",
                      border:
                        preferences.menuPosition === "side"
                          ? "2px solid #1976d2"
                          : "1px solid #e0e0e0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: preferences.menuPosition === "side" ? "scale(1.02)" : "scale(1)",
                      "&:hover": { borderColor: "#1976d2", transform: "scale(1.02)" },
                    }}
                    onClick={() =>
                      handleMenuPositionChange({
                        target: { value: "side" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <MenuIcon />
                      <Typography variant="subtitle1">Side Menu</Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: (theme) => (theme.palette.mode === "light" ? "#fff" : "#222"),
                        color: (theme) => (theme.palette.mode === "light" ? "#333" : "#fff"),
                        border: (theme) =>
                          `1px solid ${theme.palette.mode === "light" ? "#e0e0e0" : "#444"}`,
                        borderRadius: 1,
                        height: 100,
                        display: "flex",
                        overflow: "hidden",
                      }}
                    >
                      {/* Side menu mockup */}
                      <Box
                        sx={{
                          width: "30%",
                          height: "100%",
                          bgcolor: (theme) => (theme.palette.mode === "light" ? "#f5f5f5" : "#333"),
                          borderRight: (theme) =>
                            `1px solid ${theme.palette.mode === "light" ? "#e0e0e0" : "#444"}`,
                        }}
                      >
                        <Box
                          sx={{
                            height: 8,
                            width: "80%",
                            mx: "auto",
                            mt: 1,
                            bgcolor: (theme) => (theme.palette.mode === "light" ? "#ddd" : "#555"),
                            borderRadius: 0.5,
                          }}
                        ></Box>
                        <Box
                          sx={{
                            height: 8,
                            width: "80%",
                            mx: "auto",
                            mt: 1,
                            bgcolor: (theme) => (theme.palette.mode === "light" ? "#ddd" : "#555"),
                            borderRadius: 0.5,
                          }}
                        ></Box>
                      </Box>
                      <Box sx={{ width: "70%", p: 1 }}>
                        <Box
                          sx={{
                            height: 10,
                            width: "90%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "light" ? "#eaeaea" : "#444",
                            mb: 1,
                            borderRadius: 0.5,
                          }}
                        ></Box>
                        <Box
                          sx={{
                            height: 10,
                            width: "80%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "light" ? "#eaeaea" : "#444",
                            borderRadius: 0.5,
                          }}
                        ></Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
                      bgcolor: "background.paper",
                      color: "text.primary",
                      border:
                        preferences.menuPosition === "top"
                          ? "2px solid #1976d2"
                          : "1px solid #e0e0e0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: preferences.menuPosition === "top" ? "scale(1.02)" : "scale(1)",
                      "&:hover": { borderColor: "#1976d2", transform: "scale(1.02)" },
                    }}
                    onClick={() =>
                      handleMenuPositionChange({
                        target: { value: "top" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <ArrowDropDownIcon />
                      <Typography variant="subtitle1">Top Menu</Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: (theme) => (theme.palette.mode === "light" ? "#fff" : "#222"),
                        color: (theme) => (theme.palette.mode === "light" ? "#333" : "#fff"),
                        border: (theme) =>
                          `1px solid ${theme.palette.mode === "light" ? "#e0e0e0" : "#444"}`,
                        borderRadius: 1,
                        height: 100,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                      }}
                    >
                      {/* Top menu mockup */}
                      <Box
                        sx={{
                          height: "30%",
                          width: "100%",
                          bgcolor: (theme) => (theme.palette.mode === "light" ? "#f5f5f5" : "#333"),
                          borderBottom: (theme) =>
                            `1px solid ${theme.palette.mode === "light" ? "#e0e0e0" : "#444"}`,
                          display: "flex",
                          alignItems: "center",
                          px: 1,
                        }}
                      >
                        <Box
                          sx={{
                            height: 6,
                            width: "15%",
                            bgcolor: (theme) => (theme.palette.mode === "light" ? "#ddd" : "#555"),
                            borderRadius: 0.5,
                            mr: 1,
                          }}
                        ></Box>
                        <Box
                          sx={{
                            height: 6,
                            width: "15%",
                            bgcolor: (theme) => (theme.palette.mode === "light" ? "#ddd" : "#555"),
                            borderRadius: 0.5,
                          }}
                        ></Box>
                      </Box>
                      <Box sx={{ p: 1, flexGrow: 1 }}>
                        <Box
                          sx={{
                            height: 10,
                            width: "90%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "light" ? "#eaeaea" : "#444",
                            mb: 1,
                            borderRadius: 0.5,
                          }}
                        ></Box>
                        <Box
                          sx={{
                            height: 10,
                            width: "80%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "light" ? "#eaeaea" : "#444",
                            borderRadius: 0.5,
                          }}
                        ></Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                Your current menu position:{" "}
                <strong>{preferences.menuPosition === "side" ? "Side Menu" : "Top Menu"}</strong>
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Note: Changes to menu position will take effect immediately in the dashboard view.
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Notification */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
