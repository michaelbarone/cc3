"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from "react";
import { IframeContextValue, IframeState } from "@/app/types/iframe";
import { iframeReducer, IframeStateMap } from "./reducer";
import { setIframeStatus, updateIframeActivity, resetIframe as resetIframeAction } from "./actions";

const IframeContext = createContext<IframeContextValue | null>(null);

interface IframeProviderProps {
  children: ReactNode;
  initialStates?: IframeStateMap;
  activeUrlId?: string | null;
}

export function IframeProvider({
  children,
  initialStates = {},
  activeUrlId = null,
}: IframeProviderProps) {
  const [states, dispatch] = useReducer(iframeReducer, initialStates);

  const resetIframe = useCallback((urlId: string) => {
    dispatch(resetIframeAction(urlId));
  }, []);

  const unloadIframe = useCallback((urlId: string) => {
    dispatch(setIframeStatus(urlId, "inactive-unloaded"));
  }, []);

  const reloadIframe = useCallback((urlId: string) => {
    dispatch(setIframeStatus(urlId, "active-loaded"));
    dispatch(updateIframeActivity(urlId));
  }, []);

  const getLoadedUrlIds = useCallback(() => {
    return Object.entries(states)
      .filter(([, state]) => state.status === "active-loaded" || state.status === "inactive-loaded")
      .map(([urlId]) => urlId);
  }, [states]);

  const value = useMemo(
    () => ({
      states,
      activeUrlId,
      dispatch,
      resetIframe,
      unloadIframe,
      reloadIframe,
      getLoadedUrlIds,
    }),
    [states, activeUrlId, resetIframe, unloadIframe, reloadIframe, getLoadedUrlIds],
  );

  return <IframeContext.Provider value={value}>{children}</IframeContext.Provider>;
}

export function useIframeContext() {
  const context = useContext(IframeContext);
  if (!context) {
    throw new Error("useIframeContext must be used within an IframeProvider");
  }
  return context;
}

// Helper hook for accessing iframe state
export function useIframeState(urlId: string): IframeState | null {
  const { states } = useIframeContext();
  return states[urlId] || null;
}
