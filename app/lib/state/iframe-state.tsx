"use client";

import type { IframeAction, IframeState, IframeUrl } from "@/app/types/iframe";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";

// Initial state
const initialState: IframeState = {
  urls: {},
  activeUrlId: null,
  initialUrlId: null,
};

// Context
const IframeContext = createContext<{
  state: IframeState;
  dispatch: React.Dispatch<IframeAction>;
} | null>(null);

// Optimized reducer that prevents unnecessary state updates
function iframeReducer(state: IframeState, action: IframeAction): IframeState {
  switch (action.type) {
    case "INIT_URLS": {
      const urls: Record<string, IframeUrl> = {};
      action.payload.urlGroups.forEach((group) => {
        group.urls.forEach((url) => {
          urls[url.id] = {
            id: url.id,
            url: url.url,
            urlMobile: url.urlMobile ?? null,
            isLoaded: false,
            isVisible: false,
            error: null,
            retryCount: 0,
          };
        });
      });

      // Set initial URL as visible but not loaded
      if (action.payload.initialUrlId && urls[action.payload.initialUrlId]) {
        urls[action.payload.initialUrlId] = {
          ...urls[action.payload.initialUrlId],
          isVisible: true,
        };
      }

      return {
        ...state,
        urls,
        initialUrlId: action.payload.initialUrlId,
        activeUrlId: action.payload.initialUrlId,
      };
    }

    case "SELECT_URL": {
      const { urlId } = action.payload;

      // Check if already selected to prevent unnecessary updates
      if (state.activeUrlId === urlId && state.urls[urlId]?.isVisible) {
        return state;
      }

      const urls = { ...state.urls };

      // Hide previous active URL if it exists
      if (state.activeUrlId && urls[state.activeUrlId]) {
        urls[state.activeUrlId] = {
          ...urls[state.activeUrlId],
          isVisible: false,
        };
      }

      // Show selected URL but don't change its loaded state
      urls[urlId] = {
        ...urls[urlId],
        isVisible: true,
        error: null,
        retryCount: 0,
      };

      return {
        ...state,
        urls,
        activeUrlId: urlId,
      };
    }

    case "LOAD_URL": {
      const { urlId } = action.payload;

      // Check if already loaded to prevent unnecessary updates
      if (state.urls[urlId]?.isLoaded) {
        return state;
      }

      return {
        ...state,
        urls: {
          ...state.urls,
          [urlId]: {
            ...state.urls[urlId],
            isLoaded: true,
            error: null,
          },
        },
      };
    }

    case "UNLOAD_URL": {
      const { urlId } = action.payload;

      // Check if already unloaded to prevent unnecessary updates
      if (!state.urls[urlId]?.isLoaded) {
        return state;
      }

      return {
        ...state,
        urls: {
          ...state.urls,
          [urlId]: {
            ...state.urls[urlId],
            isLoaded: false,
            error: null,
            retryCount: 0,
          },
        },
      };
    }

    case "SET_ERROR": {
      const { urlId, error } = action.payload;
      const url = state.urls[urlId];

      // Check if error state is the same to prevent unnecessary updates
      if (url.error === error) {
        return state;
      }

      return {
        ...state,
        urls: {
          ...state.urls,
          [urlId]: {
            ...url,
            error,
            retryCount: error ? url.retryCount + 1 : 0,
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
  initialActiveUrlId?: string;
}

export function IframeProvider({ children, initialActiveUrlId }: IframeProviderProps) {
  const [state, baseDispatch] = useReducer(iframeReducer, {
    ...initialState,
    activeUrlId: initialActiveUrlId ?? null,
    initialUrlId: initialActiveUrlId ?? null,
  });

  // Wrap dispatch in useCallback to prevent unnecessary re-renders
  const dispatch = useCallback(baseDispatch, []);

  // Memoize context value to prevent unnecessary rerenders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <IframeContext.Provider value={contextValue}>{children}</IframeContext.Provider>;
}

// Hook to use the iframe state
export function useIframeState() {
  const context = useContext(IframeContext);
  if (!context) {
    throw new Error("useIframeState must be used within an IframeProvider");
  }
  return context;
}
