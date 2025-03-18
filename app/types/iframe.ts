// Core iframe status type
export type IframeStatus =
  | "active-loaded"
  | "active-unloaded"
  | "inactive-loaded"
  | "inactive-unloaded";

// Base iframe state interface
export interface IframeState {
  id: string;
  url: string;
  urlMobile: string | null;
  status: IframeStatus;
  error: string | null;
  lastActivity: number;
  idleTimeout: number;
}

// Action types for state management
export type IframeAction =
  | { type: "SET_STATUS"; payload: { urlId: string; status: IframeStatus } }
  | { type: "SET_ERROR"; payload: { urlId: string; error: string | null } }
  | { type: "UPDATE_ACTIVITY"; payload: { urlId: string } }
  | { type: "RESET_IFRAME"; payload: { urlId: string } }
  | { type: "SET_IDLE_TIMEOUT"; payload: { urlId: string; timeout: number } }
  | { type: "SET_URL"; payload: { urlId: string; url: string; urlMobile: string | null } };

// Context value interface
export interface IframeContextValue {
  states: Record<string, IframeState>;
  activeUrlId: string | null;
  dispatch: (action: IframeAction) => void;
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

// Ref type for external control
export interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}

// Props interface for the main container
export interface IframeContainerProps {
  activeUrlId: string | null;
  activeUrl: {
    id: string;
    url: string;
    urlMobile?: string | null;
    idleTimeout?: number;
  } | null;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
  urlGroups?: Array<{
    id: string;
    name: string;
    urls: Array<{
      id: string;
      url: string;
      urlMobile?: string | null;
      idleTimeout?: number;
    }>;
  }>;
}
