'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/auth-context';

interface UserPreferences {
  menuPosition: 'side' | 'top';
  themeMode: 'light' | 'dark';
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
  updateMenuPosition: (position: 'side' | 'top') => Promise<void>;
  updateThemeMode: (mode: 'light' | 'dark') => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  menuPosition: 'side',
  themeMode: 'light',
};

export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({ ...DEFAULT_PREFERENCES });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 5000; // 5 seconds cache

  // Load preferences from the server
  useEffect(() => {
    const fetchPreferences = async () => {
      // Skip if no user
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if we should use cached data
      const now = Date.now();
      if (fetchedRef.current && (now - lastFetchTime.current < CACHE_DURATION)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/user/preferences');

        if (!response.ok) {
          throw new Error('Failed to fetch user preferences');
        }

        const data = await response.json();

        // Carefully merge preferences - only apply defaults for missing properties
        const mergedPreferences = {
          ...DEFAULT_PREFERENCES,
          ...data.preferences,
        };

        setPreferences(mergedPreferences);
        fetchedRef.current = true;
        lastFetchTime.current = now;
      } catch (err) {
        console.error('Error fetching user preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]); // Only depend on user changes

  // Update menu position with debouncing
  const updateMenuPosition = useCallback(async (position: 'side' | 'top') => {
    if (!user) return;

    // Don't update if it's the same as current value
    if (preferences.menuPosition === position) {
      return;
    }

    try {
      setError(null);
      // Optimistically update the UI
      setPreferences(prev => ({
        ...prev,
        menuPosition: position,
      }));

      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuPosition: position }),
      });

      if (!response.ok) {
        throw new Error('Failed to update menu position');
      }

      const data = await response.json();
      lastFetchTime.current = Date.now(); // Update cache time after successful update

      // Update with server response
      setPreferences(prev => ({
        ...prev,
        menuPosition: data.preferences.menuPosition,
      }));
    } catch (err) {
      console.error('Error updating menu position:', err);
      setError('Failed to update menu position');
      // Revert on error
      setPreferences(prev => ({
        ...prev,
        menuPosition: preferences.menuPosition,
      }));
      throw err;
    }
  }, [user, preferences.menuPosition]);

  // Update theme mode with debouncing
  const updateThemeMode = useCallback(async (mode: 'light' | 'dark') => {
    if (!user) return;

    // Don't update if it's the same as current value
    if (preferences.themeMode === mode) {
      return;
    }

    try {
      setError(null);
      // Optimistically update the UI
      setPreferences(prev => ({
        ...prev,
        themeMode: mode,
      }));

      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeMode: mode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update theme mode');
      }

      const data = await response.json();
      lastFetchTime.current = Date.now(); // Update cache time after successful update

      // Update with server response
      setPreferences(prev => ({
        ...prev,
        themeMode: data.preferences.themeMode,
      }));
    } catch (err) {
      console.error('Error updating theme mode:', err);
      setError('Failed to update theme mode');
      // Revert on error
      setPreferences(prev => ({
        ...prev,
        themeMode: preferences.themeMode,
      }));
      throw err;
    }
  }, [user, preferences.themeMode]);

  return {
    preferences,
    loading,
    error,
    updateMenuPosition,
    updateThemeMode,
  };
}
