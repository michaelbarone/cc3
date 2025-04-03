// URL and Group Types
export interface UrlGroup {
  id: string;
  name: string;
  urls: Array<{
    id: string;
    url: string;
    urlMobile?: string | null;
  }>;
}

// Core iframe state types
export interface IframeUrl {
  id: string;
  url: string;
  urlMobile: string | null;
  isLoaded: boolean;
  isVisible: boolean;
  error: string | null;
  retryCount: number;
}

export interface IframeState {
  urls: Record<string, IframeUrl>;
  activeUrlId: string | null;
  initialUrlId: string | null;
}

// Action types
export type IframeAction =
  | { type: "INIT_URLS"; payload: { urlGroups: UrlGroup[]; initialUrlId: string } }
  | { type: "SELECT_URL"; payload: { urlId: string } }
  | { type: "LOAD_URL"; payload: { urlId: string } }
  | { type: "UNLOAD_URL"; payload: { urlId: string } }
  | { type: "SET_ERROR"; payload: { urlId: string; error: string | null } };

// Props types
export interface IframeContainerProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onLoad?: (urlId: string) => void;
  onError?: (urlId: string, error: string) => void;
  onUnload?: (urlId: string) => void;
}

// Ref type for external control
export interface IframeContainerRef {
  resetIframe: (urlId: string) => void;
  unloadIframe: (urlId: string) => void;
  reloadUnloadedIframe: (urlId: string) => void;
  getLoadedUrlIds: () => string[];
}
