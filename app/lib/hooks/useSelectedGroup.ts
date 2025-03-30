"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";

interface UseSelectedGroupReturn {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => Promise<void>;
}

export function useSelectedGroup(): UseSelectedGroupReturn {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(null);

  // Load selected group from server on mount
  useEffect(() => {
    const loadSelectedGroup = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/user/preferences");
        if (!response.ok) return;

        const data = await response.json();
        if (data.preferences?.lastSelectedGroupId) {
          setSelectedGroupIdState(data.preferences.lastSelectedGroupId);
        }
      } catch (error) {
        console.error("Error loading selected group:", error);
      }
    };

    loadSelectedGroup();
  }, [user]);

  // Update selected group with persistence
  const setSelectedGroupId = useCallback(
    async (groupId: string) => {
      if (!user) return;

      try {
        setSelectedGroupIdState(groupId);

        const response = await fetch("/api/user/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lastSelectedGroupId: groupId }),
        });

        if (!response.ok) {
          throw new Error("Failed to update selected group");
        }
      } catch (error) {
        console.error("Error updating selected group:", error);
      }
    },
    [user],
  );

  return {
    selectedGroupId,
    setSelectedGroupId,
  };
}
