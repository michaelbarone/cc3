"use client";

import { createContext, useState, useEffect, useMemo, ReactNode, useRef } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme } from "./theme";
import { useAuth } from "@/app/lib/auth/auth-context";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";

// Define the context for theme mode
interface ThemeContextType {
  toggleColorMode: () => void;
  mode: "light" | "dark";
}

export const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: "dark",
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"light" | "dark">(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("themeMode");
      if (savedMode === "light" || savedMode === "dark") {
        return savedMode;
      }
    }
    return "dark";
  });
  const { preferences, loading, updateThemeMode } = useUserPreferences();
  const initializedRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_DEBOUNCE = 1000; // 1 second debounce

  // Initialize theme from user data when it becomes available from auth
  useEffect(() => {
    if (user?.themeMode && !initializedRef.current) {
      setMode(user.themeMode as "light" | "dark");
      initializedRef.current = true;
    }
  }, [user]);

  // Initialize theme from user preferences when they load
  useEffect(() => {
    if (!loading && preferences.themeMode && !initializedRef.current) {
      setMode(preferences.themeMode as "light" | "dark");
      initializedRef.current = true;
    }
  }, [preferences.themeMode, loading]);

  // Store theme preference in localStorage and sync with server
  useEffect(() => {
    const now = Date.now();
    if (initializedRef.current && now - lastUpdateRef.current > UPDATE_DEBOUNCE) {
      localStorage.setItem("themeMode", mode);
      if (user) {
        lastUpdateRef.current = now;
        updateThemeMode(mode).catch(console.error);
      }
    }
  }, [mode, user, updateThemeMode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
      mode,
    }),
    [mode],
  );

  const theme = useMemo(() => (mode === "light" ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
