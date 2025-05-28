"use client";

import { useUserPreferences } from "@/app/contexts/UserPreferencesProvider";
import { darkTheme, lightTheme } from "@/app/theme/themes";
import { Theme } from "@/app/types/user-settings";
import CssBaseline from "@mui/material/CssBaseline";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import { ReactNode, useEffect, useState } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useUserPreferences();
  const [currentTheme, setCurrentTheme] = useState(darkTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

  // Listen for system preference changes
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== "undefined") {
      // Initial check for system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSystemPrefersDark(prefersDark);

      // Listen for changes in system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemPrefersDark(e.matches);
      };

      // Add event listener
      mediaQuery.addEventListener("change", handleChange);

      // Cleanup
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, []);

  // Update theme based on user preference and system preference
  useEffect(() => {
    switch (theme) {
      case Theme.LIGHT:
        setCurrentTheme(lightTheme);
        break;
      case Theme.DARK:
        setCurrentTheme(darkTheme);
        break;
      case Theme.SYSTEM:
      default:
        setCurrentTheme(systemPrefersDark ? darkTheme : lightTheme);
        break;
    }
  }, [theme, systemPrefersDark]);

  // Apply responsive font sizes
  const responsiveTheme = responsiveFontSizes(createTheme(currentTheme));

  return (
    <MuiThemeProvider theme={responsiveTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
