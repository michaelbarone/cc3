"use client";

import { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import { IframeState, IframeStatus } from "@/app/types/iframe";

// Action types
type IframeAction =
  | { type: "SET_STATUS"; payload: { urlId: string; status: IframeStatus } }
  | { type: "SET_ERROR"; payload: { urlId: string; error: string | null } }
  | { type: "UPDATE_ACTIVITY"; payload: { urlId: string } }
  | { type: "RESET_IFRAME"; payload: { urlId: string } }
  | { type: "SET_IDLE_TIMEOUT"; payload: { urlId: string; minutes: number } }
  | { type: "SET_URL"; payload: { urlId: string; url: string; urlMobile: string | null } }
  | { type: "SET_ACTIVE_URL"; payload: { urlId: string } }
  | { type: "LOAD_URL"; payload: { urlId: string } }
  | { type: "UNLOAD_URL"; payload: { urlId: string } }
  | { type: "RELOAD_URL"; payload: { urlId: string } };

// Context state type
interface IframeContextState {
  states: Record<string, IframeState>;
  activeUrlId: string | null;
}

// Context value type including dispatch
interface IframeContextValue extends IframeContextState {
  dispatch: (action: IframeAction) => void;
}

// Create the context
const IframeContext = createContext<IframeContextValue | undefined>(undefined);

// Initial state
const initialState: IframeContextState = {
  states: {},
  activeUrlId: null,
};

// Reducer function
function iframeReducer(state: IframeContextState, action: IframeAction): IframeContextState {
  // Helper function to ensure URL state exists
  const ensureUrlState = (urlId: string) => {
    if (!state.states[urlId]) {
      state.states[urlId] = {
        id: urlId,
        status: "inactive-unloaded",
        error: null,
        lastActivity: Date.now(),
        idleTimeout: 10, // Default 10 minutes
        url: "",
        urlMobile: null,
      };
    }
  };

  switch (action.type) {
    case "SET_STATUS": {
      const { urlId, status } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            status,
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "SET_ERROR": {
      const { urlId, error } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            error,
            status: error ? "active-unloaded" : state.states[urlId].status,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "UPDATE_ACTIVITY": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "RESET_IFRAME": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            status: "active-unloaded",
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "SET_IDLE_TIMEOUT": {
      const { urlId, minutes } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            idleTimeout: minutes,
          },
        },
      };
    }

    case "SET_URL": {
      const { urlId, url, urlMobile } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            url,
            urlMobile,
            status: "inactive-unloaded",
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "SET_ACTIVE_URL": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);

      // Update previous active URL to inactive state
      const prevState = state.activeUrlId
        ? {
            ...state.states,
            [state.activeUrlId]: {
              ...state.states[state.activeUrlId],
              status: state.states[state.activeUrlId].status.replace(
                "active",
                "inactive",
              ) as IframeStatus,
            },
          }
        : state.states;

      // Update new active URL
      return {
        activeUrlId: urlId,
        states: {
          ...prevState,
          [urlId]: {
            ...prevState[urlId],
            status: prevState[urlId].status.replace("inactive", "active") as IframeStatus,
          },
        },
      };
    }

    case "LOAD_URL": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            status: state.states[urlId].status.includes("active")
              ? "active-loaded"
              : "inactive-loaded",
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "UNLOAD_URL": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            status: state.states[urlId].status.includes("active")
              ? "active-unloaded"
              : "inactive-unloaded",
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    case "RELOAD_URL": {
      const { urlId } = action.payload;
      ensureUrlState(urlId);
      return {
        ...state,
        states: {
          ...state.states,
          [urlId]: {
            ...state.states[urlId],
            status: state.states[urlId].status.includes("active")
              ? "active-loaded"
              : "inactive-loaded",
            error: null,
            lastActivity: Date.now(),
          },
        },
      };
    }

    default:
      return state;
  }
}

// Provider component
interface IframeProviderProps {
  children: ReactNode;
  activeUrlId: string | null;
}

export function IframeProvider({ children, activeUrlId }: IframeProviderProps) {
  const [state, dispatch] = useReducer(iframeReducer, {
    ...initialState,
    activeUrlId,
  });

  // Update state when activeUrlId prop changes
  useEffect(() => {
    if (activeUrlId !== state.activeUrlId) {
      dispatch({ type: "SET_ACTIVE_URL", payload: { urlId: activeUrlId || "" } });
    }
  }, [activeUrlId]);

  return <IframeContext.Provider value={{ ...state, dispatch }}>{children}</IframeContext.Provider>;
}

// Hook for using the context
export function useIframeContext() {
  const context = useContext(IframeContext);
  if (!context) {
    throw new Error("useIframeContext must be used within an IframeProvider");
  }
  return context;
}
