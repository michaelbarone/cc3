'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Url } from '../types';

interface IframeStateContextType {
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
}

const IframeStateContext = createContext<IframeStateContextType | undefined>(undefined);

export function useIframeState() {
  const context = useContext(IframeStateContext);
  if (!context) {
    throw new Error('useIframeState must be used within an IframeStateProvider');
  }
  return context;
}

interface IframeStateProviderProps {
  children: ReactNode;
}

export function IframeStateProvider({ children }: IframeStateProviderProps) {
  // Core state
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrlObject] = useState<Url | null>(null);
  const [loadedUrlIds, setLoadedUrlIds] = useState<string[]>([]);
  const [knownUrlIds, setKnownUrlIds] = useState<Set<string>>(new Set());

  // Helper: Update URL in browser history
  const updateBrowserHistory = (urlId: string) => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('url', urlId);
    window.history.pushState({}, '', newUrl.toString());
  };

  // Helper: Save to server persistence
  const saveToPersistence = async (urlId: string): Promise<void> => {
    try {
      const response = await fetch('/api/users/last-active-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urlId }),
      });

      if (!response.ok) {
        console.error('Failed to update last active URL');
      }
    } catch (error) {
      console.error('Error updating last active URL:', error);
    }
  };

  // Listen for browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const urlId = url.searchParams.get('url');

      if (urlId && urlId !== activeUrlId) {
        // We need to find the URL object to update it properly
        // This will be handled by the consuming component
        console.log('Browser navigation detected, URL ID:', urlId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeUrlId]);

  // Update known URL IDs when loadedUrlIds changes
  useEffect(() => {
    setKnownUrlIds(prev => {
      const newSet = new Set(prev);
      loadedUrlIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [loadedUrlIds]);

  // Set active URL (both ID and object)
  const setActiveUrl = (url: Url) => {
    setActiveUrlId(url.id);
    setActiveUrlObject(url);

    // Update browser history
    updateBrowserHistory(url.id);

    // Save to server
    saveToPersistence(url.id);
  };

  // Reset iframe (reload)
  const resetIframe = (urlId: string) => {
    // This is a placeholder - actual implementation will be handled by iframe component
    console.log('Reset iframe:', urlId);
  };

  // Unload iframe
  const unloadIframe = (urlId: string) => {
    // This is a placeholder - actual implementation will be handled by iframe component
    console.log('Unload iframe:', urlId);

    // Remove from loaded URLs
    removeLoadedUrlId(urlId);
  };

  // Reload iframe
  const reloadIframe = (urlId: string) => {
    // This is a placeholder - actual implementation will be handled by iframe component
    console.log('Reload iframe:', urlId);
  };

  // Add URL ID to loaded URLs
  const addLoadedUrlId = (urlId: string) => {
    setLoadedUrlIds(prev => {
      if (!prev.includes(urlId)) {
        return [...prev, urlId];
      }
      return prev;
    });
  };

  // Remove URL ID from loaded URLs
  const removeLoadedUrlId = (urlId: string) => {
    setLoadedUrlIds(prev => prev.filter(id => id !== urlId));
  };

  const value = {
    activeUrlId,
    activeUrl,
    loadedUrlIds,
    knownUrlIds,
    setActiveUrl,
    resetIframe,
    unloadIframe,
    reloadIframe,
    addLoadedUrlId,
    removeLoadedUrlId,
    updateBrowserHistory,
    saveToPersistence
  };

  return (
    <IframeStateContext.Provider value={value}>
      {children}
    </IframeStateContext.Provider>
  );
}
