"use client";

import { MenuPosition, Theme, UserSettingsUpdateRequest } from "@/app/types/user-settings";
import { useSession } from "next-auth/react";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface UserPreferencesContextType {
  theme: Theme;
  menuPosition: MenuPosition;
  isLoading: boolean;
  updatePreferences: (preferences: UserSettingsUpdateRequest) => Promise<void>;
}

const defaultContextValue: UserPreferencesContextType = {
  theme: Theme.SYSTEM,
  menuPosition: MenuPosition.TOP,
  isLoading: true,
  updatePreferences: async () => {},
};

const UserPreferencesContext = createContext<UserPreferencesContextType>(defaultContextValue);

export const useUserPreferences = () => useContext(UserPreferencesContext);

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export function UserPreferencesProvider({ children }: UserPreferencesProviderProps) {
  const { data: session, update: updateSession } = useSession();
  const [preferences, setPreferences] = useState<UserPreferencesContextType>({
    ...defaultContextValue,
  });

  // Load user preferences from session when available
  useEffect(() => {
    // If session is not yet loaded, keep using defaults
    if (!session) return;

    // Extract preferences from session with fallbacks to defaults
    const theme = session.user?.theme ? (session.user.theme as Theme) : Theme.SYSTEM;
    const menuPosition = session.user?.menuPosition
      ? (session.user.menuPosition as MenuPosition)
      : MenuPosition.TOP;

    setPreferences((prev) => ({
      ...prev,
      theme,
      menuPosition,
      isLoading: false,
    }));
  }, [session]);

  // Update user preferences
  const updatePreferences = async (newPreferences: UserSettingsUpdateRequest) => {
    try {
      // Update the state immediately for a responsive UI
      if (newPreferences.theme) {
        setPreferences((prev) => ({ ...prev, theme: newPreferences.theme as Theme }));
      }
      if (newPreferences.menuPosition) {
        setPreferences((prev) => ({
          ...prev,
          menuPosition: newPreferences.menuPosition as MenuPosition,
        }));
      }

      // Send the update to the server
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`);
      }

      // Also update the session with the new preferences
      // This ensures preferences are consistent across the app
      await updateSession({
        ...newPreferences,
      });

      // No need to fetch updated preferences since we already updated locally
    } catch (error) {
      console.error("Error updating preferences:", error);
      // Revert to session values on error
      if (session?.user) {
        setPreferences((prev) => ({
          ...prev,
          theme: (session.user?.theme as Theme) || Theme.SYSTEM,
          menuPosition: (session.user?.menuPosition as MenuPosition) || MenuPosition.TOP,
        }));
      }
    }
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        ...preferences,
        updatePreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}
