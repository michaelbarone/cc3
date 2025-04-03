import { IframeAction } from "@/app/types/iframe";

export function loadUrl(urlId: string): IframeAction {
  return {
    type: "LOAD_URL",
    payload: { urlId },
  };
}

export function unloadUrl(urlId: string): IframeAction {
  return {
    type: "UNLOAD_URL",
    payload: { urlId },
  };
}

export function selectUrl(urlId: string): IframeAction {
  return {
    type: "SELECT_URL",
    payload: { urlId },
  };
}

export function setError(urlId: string, error: string | null): IframeAction {
  return {
    type: "SET_ERROR",
    payload: { urlId, error },
  };
}
