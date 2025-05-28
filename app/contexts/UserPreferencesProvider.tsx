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
  const { data: session, status } = useSession();
  const [theme, setTheme] = useState<Theme>(Theme.SYSTEM);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(MenuPosition.TOP);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from session data
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Get theme and menu position from session if available
      if (session.user.theme) {
        setTheme(session.user.theme as Theme);
      }
      if (session.user.menuPosition) {
        setMenuPosition(session.user.menuPosition as MenuPosition);
      }
      setIsLoading(false);
    } else if (status === "unauthenticated") {
      // Set defaults for unauthenticated users
      setTheme(Theme.SYSTEM);
      setMenuPosition(MenuPosition.TOP);
      setIsLoading(false);
    }
  }, [session, status]);

  // Function to update user preferences
  const updatePreferences = async (preferences: UserSettingsUpdateRequest) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      const data = await response.json();

      // Update local state
      if (preferences.theme) {
        setTheme(preferences.theme);
      }
      if (preferences.menuPosition) {
        setMenuPosition(preferences.menuPosition);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error updating preferences:", error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        theme,
        menuPosition,
        isLoading,
        updatePreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}
