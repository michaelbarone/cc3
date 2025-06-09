"use client";

import { useUserPreferences } from "@/app/contexts/UserPreferencesProvider";
import { MenuPosition, Theme, UserSettingsUpdateRequest } from "@/app/types/user-settings";
import {
  Alert,
  AlertColor,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Typography,
} from "@mui/material";
import Image from "next/image";
import React, { useState } from "react";

export function UserPreferencesSection() {
  const { theme, menuPosition, updatePreferences, isLoading } = useUserPreferences();
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [selectedMenuPosition, setSelectedMenuPosition] = useState<MenuPosition>(menuPosition);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>("success");

  // Check if any preference has changed
  const hasChanges = selectedTheme !== theme || selectedMenuPosition !== menuPosition;

  // Handle theme change
  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTheme(event.target.value as Theme);
  };

  // Handle menu position change
  const handleMenuPositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMenuPosition(event.target.value as MenuPosition);
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hasChanges) {
      setSnackbarMessage("No changes to save");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }

    try {
      const preferences: UserSettingsUpdateRequest = {};

      if (selectedTheme !== theme) {
        preferences.theme = selectedTheme;
      }

      if (selectedMenuPosition !== menuPosition) {
        preferences.menuPosition = selectedMenuPosition;
      }

      await updatePreferences(preferences);

      setSnackbarMessage("Preferences saved successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Theme preview box
  const ThemePreview = ({ previewTheme, label }: { previewTheme: Theme; label: string }) => {
    const isSelected = selectedTheme === previewTheme;
    const bgColor = previewTheme === Theme.DARK ? "#121212" : "#ffffff";
    const textColor = previewTheme === Theme.DARK ? "#ffffff" : "rgba(0, 0, 0, 0.87)";
    const borderColor = isSelected ? "#1976d2" : "rgba(0, 0, 0, 0.12)";

    return (
      <Paper
        elevation={isSelected ? 3 : 1}
        sx={{
          p: 2,
          width: "100%",
          height: 100,
          backgroundColor: bgColor,
          color: textColor,
          border: `2px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 4,
          },
        }}
        onClick={() => setSelectedTheme(previewTheme)}
      >
        <Typography variant="subtitle1" color={textColor}>
          {label}
        </Typography>
        <Typography variant="caption" color={textColor} sx={{ opacity: 0.7 }}>
          AppName
        </Typography>
      </Paper>
    );
  };

  // SVG fallback for menu position previews
  const topMenuSvgFallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect width='120' height='16' fill='%23ccc'/%3E%3Crect y='16' width='120' height='64' fill='%23eee'/%3E%3Ctext x='60' y='10' font-family='Arial' font-size='8' text-anchor='middle' fill='%23333'%3ETop Menu%3C/text%3E%3C/svg%3E";
  const sideMenuSvgFallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect width='24' height='80' fill='%23ccc'/%3E%3Crect x='24' width='96' height='80' fill='%23eee'/%3E%3Ctext x='12' y='40' font-family='Arial' font-size='8' text-anchor='middle' writing-mode='tb' fill='%23333'%3ESide Menu%3C/text%3E%3C/svg%3E";

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Layout & Appearance Preferences
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Preferred Theme
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <ThemePreview previewTheme={Theme.LIGHT} label="Light" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <ThemePreview previewTheme={Theme.DARK} label="Dark" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <ThemePreview previewTheme={Theme.SYSTEM} label="System" />
          </Grid>
        </Grid>
        <RadioGroup
          aria-label="theme"
          name="theme"
          value={selectedTheme}
          onChange={handleThemeChange}
          row
          sx={{ display: "none" }}
        >
          <FormControlLabel value={Theme.LIGHT} control={<Radio />} label="Light" />
          <FormControlLabel value={Theme.DARK} control={<Radio />} label="Dark" />
          <FormControlLabel value={Theme.SYSTEM} control={<Radio />} label="System" />
        </RadioGroup>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Preferred Menu Position (Desktop)
        </Typography>
        <RadioGroup
          aria-label="menuPosition"
          name="menuPosition"
          value={selectedMenuPosition}
          onChange={handleMenuPositionChange}
          row
        >
          <FormControlLabel
            value={MenuPosition.TOP}
            control={<Radio />}
            label={
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box
                  sx={{
                    position: "relative",
                    width: 120,
                    height: 80,
                    marginBottom: 1,
                  }}
                >
                  <Image
                    src="/top-menu-preview.png"
                    alt="Top Menu Preview"
                    fill
                    style={{ objectFit: "contain" }}
                    onError={() => {
                      const imgElement = document.querySelector('[alt="Top Menu Preview"]');
                      if (imgElement) {
                        imgElement.setAttribute("src", topMenuSvgFallback);
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2">Top Menu</Typography>
              </Box>
            }
          />
          <FormControlLabel
            value={MenuPosition.SIDE}
            control={<Radio />}
            label={
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box
                  sx={{
                    position: "relative",
                    width: 120,
                    height: 80,
                    marginBottom: 1,
                  }}
                >
                  <Image
                    src="/side-menu-preview.png"
                    alt="Side Menu Preview"
                    fill
                    style={{ objectFit: "contain" }}
                    onError={() => {
                      const imgElement = document.querySelector('[alt="Side Menu Preview"]');
                      if (imgElement) {
                        imgElement.setAttribute("src", sideMenuSvgFallback);
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2">Side Menu</Typography>
              </Box>
            }
          />
        </RadioGroup>
      </Box>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading || !hasChanges}
        sx={{ mt: 2 }}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Save Preferences"}
      </Button>

      <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
