import type { UrlGroup } from "@/app/types/iframe";
import { useCallback } from "react";
import { useIframeState } from "../state/iframe-state";

export function useUrlManager(urlGroups: UrlGroup[]) {
  const { state, dispatch } = useIframeState();

  const initializeUrls = useCallback(
    (initialUrlId?: string) => {
      dispatch({
        type: "INIT_URLS",
        payload: {
          urlGroups,
          initialUrlId: initialUrlId || urlGroups[0]?.urls[0]?.id || "",
        },
      });
    },
    [dispatch, urlGroups],
  );

  const selectUrl = useCallback(
    (urlId: string) => {
      dispatch({ type: "SELECT_URL", payload: { urlId } });
    },
    [dispatch],
  );

  const unloadUrl = useCallback(
    (urlId: string) => {
      dispatch({ type: "UNLOAD_URL", payload: { urlId } });
    },
    [dispatch],
  );

  return {
    activeUrlId: state.activeUrlId,
    urls: state.urls,
    initializeUrls,
    selectUrl,
    unloadUrl,
  };
}

export function useIframeLifecycle(urlId: string) {
  const { state, dispatch } = useIframeState();
  const urlState = state.urls[urlId];

  const handleLoad = useCallback(() => {
    dispatch({ type: "LOAD_URL", payload: { urlId } });
  }, [dispatch, urlId]);

  const handleError = useCallback(
    (error: string) => {
      dispatch({ type: "SET_ERROR", payload: { urlId, error } });
    },
    [dispatch, urlId],
  );

  return {
    isLoaded: urlState?.isLoaded ?? false,
    isVisible: urlState?.isVisible ?? false,
    error: urlState?.error ?? null,
    retryCount: urlState?.retryCount ?? 0,
    handleLoad,
    handleError,
  };
}
