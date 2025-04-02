"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Url } from "../types";

// Constants for localStorage keys
const STORAGE_KEYS = {
  ACTIVE_URL_ID: "iframe-state-active-url-id",
  ACTIVE_URL: "iframe-state-active-url",
  LOADED_URL_IDS: "iframe-state-loaded-url-ids",
  KNOWN_URL_IDS: "iframe-state-known-url-ids",
};

export interface IframeStateContextType {
  activeUrlId: string | null;
  activeUrl: Url | null;
  loadedUrlIds: string[];
  knownUrlIds: Set<string>;
  setActiveUrl: (url: Url) => void;
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadIframe: (urlId: string) => void;
  addLoadedUrlId: (urlId: string) => void;
  removeLoadedUrlId: (urlId: string) => void;
  updateBrowserHistory: (urlId: string) => void;
  saveToPersistence: (urlId: string) => Promise<void>;
  isLongPressing: boolean;
  longPressProgress: number;
  longPressUrlId: string | null;
  startLongPress: (urlId: string) => void;
  endLongPress: () => void;
  updateLongPressProgress: (progress: number) => void;
}

// Create the context
export const IframeStateContext = createContext<IframeStateContextType | null>(null);

// Provider component
export function IframeStateProvider({ children }: { children: ReactNode }) {
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [loadedUrlIds, setLoadedUrlIds] = useState<string[]>([]);
  const [knownUrlIds, setKnownUrlIds] = useState<Set<string>>(new Set());
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [longPressUrlId, setLongPressUrlId] = useState<string | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const storedActiveUrlId = localStorage.getItem(STORAGE_KEYS.ACTIVE_URL_ID);
    const storedActiveUrl = localStorage.getItem(STORAGE_KEYS.ACTIVE_URL);
    const storedKnownUrlIds = localStorage.getItem(STORAGE_KEYS.KNOWN_URL_IDS);

    // Clear any stored loadedUrlIds to ensure fresh state
    localStorage.removeItem(STORAGE_KEYS.LOADED_URL_IDS);
    setLoadedUrlIds([]);

    if (storedActiveUrlId) setActiveUrlId(storedActiveUrlId);
    if (storedActiveUrl) {
      const url = JSON.parse(storedActiveUrl);
      setActiveUrl(url);
      // Only set the active URL as loaded
      setLoadedUrlIds([url.id]);
    }
    if (storedKnownUrlIds) setKnownUrlIds(new Set(JSON.parse(storedKnownUrlIds)));
  }, []);

  // Save state to localStorage whenever it changes, but NOT loadedUrlIds
  useEffect(() => {
    if (activeUrlId) localStorage.setItem(STORAGE_KEYS.ACTIVE_URL_ID, activeUrlId);
    if (activeUrl) localStorage.setItem(STORAGE_KEYS.ACTIVE_URL, JSON.stringify(activeUrl));
    if (knownUrlIds.size)
      localStorage.setItem(STORAGE_KEYS.KNOWN_URL_IDS, JSON.stringify(Array.from(knownUrlIds)));
  }, [activeUrlId, activeUrl, knownUrlIds]);

  const handleSetActiveUrl = (url: Url) => {
    // First unload any currently loaded iframes
    if (activeUrlId && activeUrlId !== url.id) {
      setLoadedUrlIds((prev) => prev.filter((id) => id !== activeUrlId));
    }

    // Update active states
    setActiveUrlId(url.id);
    setActiveUrl(url);

    // Update known URLs
    setKnownUrlIds((prev) => new Set(Array.from(prev).concat(url.id)));

    // Set as loaded
    setLoadedUrlIds([url.id]);

    // Update browser history and persistence
    handleUpdateBrowserHistory(url.id);
    handleSaveToPersistence(url.id);
  };

  const handleResetIframe = (urlId: string) => {
    if (urlId === activeUrlId) {
      setActiveUrlId(null);
      setActiveUrl(null);
    }
    setLoadedUrlIds((prev) => prev.filter((id) => id !== urlId));
  };

  const handleUnloadIframe = (urlId: string) => {
    // Remove from loaded URLs
    setLoadedUrlIds((prev) => prev.filter((id) => id !== urlId));

    // Only clear active state if this was the active URL
    if (urlId === activeUrlId) {
      setActiveUrlId(null);
      setActiveUrl(null);
    }
  };

  const handleReloadIframe = (urlId: string) => {
    // Remove from loaded URLs
    setLoadedUrlIds((prev) => prev.filter((id) => id !== urlId));

    // Use requestAnimationFrame for smoother state updates
    requestAnimationFrame(() => {
      setLoadedUrlIds((prev) => [...prev, urlId]);
    });
  };

  const handleAddLoadedUrlId = (urlId: string) => {
    setLoadedUrlIds((prev) => [...prev, urlId]);
    setKnownUrlIds((prev) => {
      const newSet = new Set<string>();
      Array.from(prev).forEach((id) => newSet.add(id));
      newSet.add(urlId);
      return newSet;
    });
  };

  const handleRemoveLoadedUrlId = (urlId: string) => {
    setLoadedUrlIds((prev) => prev.filter((id) => id !== urlId));
  };

  const handleUpdateBrowserHistory = (urlId: string) => {
    // Update browser history with the new URL ID
    const newUrl = new URL(window.location.href);
    // Remove any existing url or urlId parameters
    newUrl.searchParams.delete("url");
    newUrl.searchParams.delete("urlId");
    // Add the new urlId parameter
    newUrl.searchParams.set("url", urlId);
    window.history.pushState({}, "", newUrl);
  };

  const handleSaveToPersistence = async (urlId: string) => {
    try {
      const response = await fetch("/api/settings/last-active-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlId }),
      });
      if (!response.ok) throw new Error("Failed to save last active URL");
    } catch (error) {
      console.error("Error saving last active URL:", error);
    }
  };

  const handleStartLongPress = (urlId: string) => {
    setIsLongPressing(true);
    setLongPressUrlId(urlId);
  };

  const handleEndLongPress = () => {
    setIsLongPressing(false);
    setLongPressUrlId(null);
    setLongPressProgress(0);
  };

  const handleUpdateLongPressProgress = (progress: number) => {
    setLongPressProgress(progress);
  };

  const value: IframeStateContextType = {
    activeUrlId,
    activeUrl,
    loadedUrlIds,
    knownUrlIds,
    setActiveUrl: handleSetActiveUrl,
    resetIframe: handleResetIframe,
    unloadIframe: handleUnloadIframe,
    reloadIframe: handleReloadIframe,
    addLoadedUrlId: handleAddLoadedUrlId,
    removeLoadedUrlId: handleRemoveLoadedUrlId,
    updateBrowserHistory: handleUpdateBrowserHistory,
    saveToPersistence: handleSaveToPersistence,
    isLongPressing,
    longPressProgress,
    longPressUrlId,
    startLongPress: handleStartLongPress,
    endLongPress: handleEndLongPress,
    updateLongPressProgress: handleUpdateLongPressProgress,
  };

  return <IframeStateContext.Provider value={value}>{children}</IframeStateContext.Provider>;
}

// Custom hook to use the iframe state
export function useIframeState() {
  const context = useContext(IframeStateContext);
  if (!context) {
    throw new Error("useIframeState must be used within an IframeStateProvider");
  }
  return context;
}
