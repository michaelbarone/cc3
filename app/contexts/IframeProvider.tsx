"use client";

import { IframeData, IframeRenderData } from "@/app/types/iframe";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Interface for the iframe context
 */
interface IframeContextType {
  /** Currently active URL identifier */
  activeUrlIdentifier: string | null;
  /** Get iframe data for a specific URL identifier */
  getIframeData: (id: string) => IframeData | undefined;
  /** Check if a URL is loaded */
  isUrlLoaded: (id: string) => boolean;
  /** Set the active URL and optionally load its content */
  setActiveUrl: (id: string, srcForDataSrc: string) => void;
  /** Mark a URL as loaded */
  markAsLoaded: (id: string) => void;
  /** Mark a URL as unloaded */
  markAsUnloaded: (id: string) => void;
  /** Trigger reload for a specific URL */
  triggerReload: (id: string) => void;
  /** Get all managed iframes for rendering */
  getAllManagedIframesForRender: () => IframeRenderData[];
}

const IframeContext = createContext<IframeContextType | null>(null);

/**
 * Custom hook to use the iframe context
 */
export const useIframeManager = () => {
  const context = useContext(IframeContext);
  if (!context) {
    throw new Error("useIframeManager must be used within an IframeProvider");
  }
  return context;
};

interface IframeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for managing iframe state
 */
export function IframeProvider({ children }: IframeProviderProps) {
  // Map of URL identifiers to iframe data
  const [managedIframes, setManagedIframes] = useState<Map<string, IframeData>>(new Map());
  // Currently active URL identifier
  const [activeUrlIdentifier, setActiveUrlIdentifier] = useState<string | null>(null);

  /**
   * Get iframe data for a specific URL identifier
   */
  const getIframeData = useCallback(
    (id: string) => {
      return managedIframes.get(id);
    },
    [managedIframes],
  );

  /**
   * Check if a URL is loaded
   */
  const isUrlLoaded = useCallback(
    (id: string) => {
      const iframe = managedIframes.get(id);
      return !!iframe?.isLoaded;
    },
    [managedIframes],
  );

  /**
   * Set the active URL and optionally load its content
   */
  const setActiveUrl = useCallback(
    (id: string, srcForDataSrc: string) => {
      // Get the existing iframe data or create a new one
      const existingData = managedIframes.get(id);

      // Create a new Map to ensure state update
      const newManagedIframes = new Map(managedIframes);

      if (existingData) {
        // Update existing iframe data
        newManagedIframes.set(id, {
          ...existingData,
          // If already loaded, keep current src, otherwise set from data-src
          currentSrc: existingData.isLoaded ? existingData.currentSrc : srcForDataSrc,
        });
      } else {
        // Create new iframe data
        newManagedIframes.set(id, {
          originalSrc: srcForDataSrc,
          currentSrc: srcForDataSrc,
          isLoaded: false, // Will be marked as loaded when iframe fires onload
        });
      }

      setManagedIframes(newManagedIframes);
      setActiveUrlIdentifier(id);
    },
    [managedIframes],
  );

  /**
   * Mark a URL as loaded
   */
  const markAsLoaded = useCallback(
    (id: string) => {
      const iframe = managedIframes.get(id);
      if (iframe) {
        const newManagedIframes = new Map(managedIframes);
        newManagedIframes.set(id, {
          ...iframe,
          isLoaded: true,
        });
        setManagedIframes(newManagedIframes);
      }
    },
    [managedIframes],
  );

  /**
   * Mark a URL as unloaded
   */
  const markAsUnloaded = useCallback(
    (id: string) => {
      if (!managedIframes.has(id)) return;

      setManagedIframes((prev) => {
        const newIframes = new Map(prev);
        const iframe = newIframes.get(id);
        if (iframe) {
          newIframes.set(id, {
            ...iframe,
            isLoaded: false,
            currentSrc: "",
          });
        }
        return newIframes;
      });
    },
    [managedIframes],
  );

  /**
   * Trigger reload for a specific URL
   */
  const triggerReload = useCallback(
    (id: string) => {
      if (!managedIframes.has(id)) return;

      const iframe = managedIframes.get(id);
      if (!iframe) return;

      // Temporarily set src to empty string, then back to original in next tick
      setManagedIframes((prev) => {
        const newIframes = new Map(prev);
        const iframe = newIframes.get(id);
        if (iframe) {
          newIframes.set(id, {
            ...iframe,
            isLoaded: false,
            currentSrc: "",
          });
        }
        return newIframes;
      });

      // Set back to original URL after a short delay
      setTimeout(() => {
        setManagedIframes((prev) => {
          const newIframes = new Map(prev);
          const iframe = newIframes.get(id);
          if (iframe) {
            newIframes.set(id, {
              ...iframe,
              isLoaded: false,
              currentSrc: iframe.originalSrc,
            });
          }
          return newIframes;
        });
      }, 50);
    },
    [managedIframes],
  );

  /**
   * Get all managed iframes for rendering
   */
  const getAllManagedIframesForRender = useCallback(() => {
    const result: IframeRenderData[] = [];

    managedIframes.forEach((iframe, id) => {
      result.push({
        identifier: id,
        dataSrc: iframe.originalSrc,
        srcToRender: iframe.currentSrc,
        isLoaded: iframe.isLoaded,
        isActive: id === activeUrlIdentifier,
      });
    });

    return result;
  }, [managedIframes, activeUrlIdentifier]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      activeUrlIdentifier,
      getIframeData,
      isUrlLoaded,
      setActiveUrl,
      markAsLoaded,
      markAsUnloaded,
      triggerReload,
      getAllManagedIframesForRender,
    }),
    [
      activeUrlIdentifier,
      getIframeData,
      isUrlLoaded,
      setActiveUrl,
      markAsLoaded,
      markAsUnloaded,
      triggerReload,
      getAllManagedIframesForRender,
    ],
  );

  return <IframeContext.Provider value={contextValue}>{children}</IframeContext.Provider>;
}
