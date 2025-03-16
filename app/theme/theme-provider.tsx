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

  // Initialize theme from user data when it becomes available from auth
  // This ensures we get the theme immediately on login
  useEffect(() => {
    // Only set theme from user data if we haven't already initialized from preferences
    if (user?.themeMode && !initializedRef.current) {
      console.log('Setting theme from user data:', user.themeMode);
      setMode(user.themeMode as 'light' | 'dark');
      initializedRef.current = true;
    }
  }, [user]);

  // Initialize theme from user preferences when they load
  // This is a backup to ensure we have the theme if user data doesn't include it
  useEffect(() => {
    // Only set the theme once when preferences are first loaded
    // This prevents theme flickering on navigation
    if (!loading && preferences.themeMode && !initializedRef.current) {
      console.log('Initial theme setting from user preferences:', preferences.themeMode);
      setMode(preferences.themeMode as 'light' | 'dark');
      initializedRef.current = true;
    }
  }, [preferences.themeMode, loading]);

  // Store theme preference in localStorage for persistence between page reloads when not logged in
  useEffect(() => {
    // Only save to localStorage if we've initialized the theme
    if (initializedRef.current) {
      localStorage.setItem('themeMode', mode);
    }
  }, [mode]);

  // Load theme from localStorage on initial load if not logged in
  useEffect(() => {
    // Only use localStorage if no user is logged in and we haven't initialized yet
    if (!user && !initializedRef.current) {
      const storedTheme = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
      if (storedTheme) {
        console.log('Loading theme from localStorage:', storedTheme);
        setMode(storedTheme);
        initializedRef.current = true;
      }
    }
  }, [user]);

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
        } else {
          // If not logged in, at least save to localStorage
          localStorage.setItem('themeMode', newMode);
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
