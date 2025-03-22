"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { createContext, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { darkTheme, lightTheme } from "./theme";

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
  const { preferences, loading, updateThemeMode } = useUserPreferences();
  const initializedRef = useRef(false);
  const [mode, setMode] = useState<"light" | "dark">("dark"); // Start with dark as fallback

  // Single initialization effect that prioritizes database preferences
  useEffect(() => {
    if (initializedRef.current) return;

    // Priority order: user preferences > user data > default dark
    if (!loading && preferences.themeMode) {
      setMode(preferences.themeMode);
      initializedRef.current = true;
    }
  }, [preferences.themeMode, loading]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        const newMode = mode === "light" ? "dark" : "light";
        setMode(newMode);
        // Update database immediately on toggle
        if (user) {
          updateThemeMode(newMode).catch(console.error);
        }
      },
      mode,
    }),
    [mode, user, updateThemeMode],
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
