'use client';

import { createContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme';
import { useAuth } from '@/app/lib/auth/auth-context';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';

// Define the context for theme mode
interface ThemeContextType {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: 'light',
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const { preferences, loading, updateThemeMode } = useUserPreferences();
  const initializedRef = useRef(false);

  // Initialize theme from user preferences ONLY ONCE
  useEffect(() => {
    // Only set the theme once when preferences are first loaded
    // This prevents theme flickering on navigation
    if (!loading && preferences.themeMode && !initializedRef.current) {
      console.log('Initial theme setting from user preferences:', preferences.themeMode);
      setMode(preferences.themeMode as 'light' | 'dark');
      initializedRef.current = true;
    }
  }, [preferences.themeMode, loading]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        // Set mode immediately to update UI
        setMode(newMode);

        // Save preference to database if user is logged in
        if (user) {
          try {
            await updateThemeMode(newMode);
          } catch (error) {
            console.error('Failed to save theme preference:', error);
          }
        }
      },
      mode,
    }),
    [mode, user, updateThemeMode]
  );

  const theme = useMemo(() => {
    return mode === 'light' ? lightTheme : darkTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
