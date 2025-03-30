"use client";

import { useSession } from "next-auth/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SelectedGroupContextType {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => void;
}

const SelectedGroupContext = createContext<SelectedGroupContextType | null>(null);

const STORAGE_KEY = "selectedGroupId";

export function SelectedGroupProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(null);

  // Load selected group from localStorage on mount
  useEffect(() => {
    if (session?.user?.email) {
      const storageKey = `${STORAGE_KEY}-${session.user.email}`;
      const storedId = localStorage.getItem(storageKey);
      if (storedId) {
        setSelectedGroupIdState(storedId);
      }
    }
  }, [session?.user?.email]);

  const setSelectedGroupId = useCallback(
    (groupId: string) => {
      // Always update the state
      setSelectedGroupIdState(groupId);

      // Persist to localStorage only if we have a session
      if (session?.user?.email) {
        const storageKey = `${STORAGE_KEY}-${session.user.email}`;
        localStorage.setItem(storageKey, groupId);
      }
    },
    [selectedGroupId, session?.user?.email],
  );

  return (
    <SelectedGroupContext.Provider value={{ selectedGroupId, setSelectedGroupId }}>
      {children}
    </SelectedGroupContext.Provider>
  );
}

export function useSelectedGroup() {
  const context = useContext(SelectedGroupContext);
  if (!context) {
    throw new Error("useSelectedGroup must be used within a SelectedGroupProvider");
  }
  return context;
}
