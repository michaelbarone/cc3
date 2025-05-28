"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { THEME_OPTIONS, ThemeMode } from "@/app/lib/utils/constants";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { createContext, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { darkTheme, lightTheme } from "./theme";

// Define the context for theme mode
interface ThemeContextType {
  toggleColorMode: () => void;
  mode: ThemeMode;
}

export const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: THEME_OPTIONS.DARK,
});

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const { preferences, isLoading: loading, updatePreferences } = useUserPreferences();
  const initializedRef = useRef(false);
  const [mode, setMode] = useState<ThemeMode>(THEME_OPTIONS.DARK); // Start with dark as fallback

  // Single initialization effect that prioritizes database preferences
  useEffect(() => {
    if (initializedRef.current) return;

    // Priority order: user preferences > user data > default dark
    if (!loading && preferences.theme) {
      setMode(preferences.theme as ThemeMode);
      initializedRef.current = true;
    }
  }, [preferences.theme, loading]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        const newMode = mode === THEME_OPTIONS.LIGHT ? THEME_OPTIONS.DARK : THEME_OPTIONS.LIGHT;
        setMode(newMode);
        // Update database immediately on toggle
        if (user) {
          updatePreferences({ theme: newMode }).catch(console.error);
        }
      },
      mode,
    }),
    [mode, user, updatePreferences],
  );

  const theme = useMemo(() => (mode === THEME_OPTIONS.LIGHT ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
