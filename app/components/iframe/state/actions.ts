import { IframeAction, IframeStatus } from "@/app/types/iframe";

export function setIframeStatus(urlId: string, status: IframeStatus): IframeAction {
  return {
    type: "SET_STATUS",
    payload: { urlId, status },
  };
}

export function setIframeError(urlId: string, error: string | null): IframeAction {
  return {
    type: "SET_ERROR",
    payload: { urlId, error },
  };
}

export function updateIframeActivity(urlId: string): IframeAction {
  return {
    type: "UPDATE_ACTIVITY",
    payload: { urlId },
  };
}

export function resetIframe(urlId: string): IframeAction {
  return {
    type: "RESET_IFRAME",
    payload: { urlId },
  };
}

export function setIdleTimeout(urlId: string, timeout: number): IframeAction {
  return {
    type: "SET_IDLE_TIMEOUT",
    payload: { urlId, timeout },
  };
}

export function setUrl(urlId: string, url: string, urlMobile: string | null): IframeAction {
  return {
    type: "SET_URL",
    payload: { urlId, url, urlMobile },
  };
}
