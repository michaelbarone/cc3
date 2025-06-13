"use client";

import { useCallback, useEffect, useState } from "react";

interface UserPreferences {
  menuPosition?: "side" | "top";
  theme?: "light" | "dark" | "system";
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch user preferences from the API
      const response = await fetch("/api/user/preferences");

      if (!response.ok) {
        throw new Error(`Failed to fetch user preferences: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract preferences from the response data
      setPreferences({
        menuPosition: data.preferences?.menuPosition,
        // Map themeMode to theme for consistency
        theme: data.preferences?.themeMode,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching user preferences:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));

      // Set default preferences on error
      setPreferences({
        menuPosition: "top",
        theme: "system",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      setIsLoading(true);

      // Map theme to themeMode for API compatibility
      const apiData = {
        ...newPreferences,
        themeMode: newPreferences.theme,
      };

      // Remove theme property since API uses themeMode
      delete apiData.theme;

      // Update user preferences via API
      const response = await fetch("/api/user/preferences", {
        method: "POST", // API uses POST instead of PUT
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update user preferences: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract preferences from the response data
      setPreferences({
        menuPosition: data.preferences?.menuPosition,
        theme: data.preferences?.themeMode,
      });
      setError(null);
    } catch (err) {
      console.error("Error updating user preferences:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
