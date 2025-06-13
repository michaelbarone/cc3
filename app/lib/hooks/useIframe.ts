import type { UrlGroup } from "@/app/types/iframe";
import { useCallback, useMemo, useState } from "react";
import { useIframeState } from "../state/iframe-state";

/**
 * Hook for managing URL selection, loading, and unloading
 *
 * @param urlGroups - Array of URL groups to manage
 * @param initialUrlId - Optional initial URL ID to select
 * @returns Object with URL state and management functions
 */
export function useUrlManager(urlGroups: UrlGroup[], initialUrlId?: string) {
  const { state, dispatch } = useIframeState();

  // Initialize URLs in state
  const initializeUrls = useCallback(
    (initialId?: string) => {
      dispatch({
        type: "INIT_URLS",
        payload: {
          urlGroups,
          initialUrlId: initialId || initialUrlId || urlGroups[0]?.urls[0]?.id || "",
        },
      });
    },
    [dispatch, urlGroups, initialUrlId],
  );

  // Select and make a URL visible
  const selectUrl = useCallback(
    (urlId: string) => {
      dispatch({ type: "SELECT_URL", payload: { urlId } });
    },
    [dispatch],
  );

  // Unload a URL's content
  const unloadUrl = useCallback(
    (urlId: string) => {
      dispatch({ type: "UNLOAD_URL", payload: { urlId } });
    },
    [dispatch],
  );

  // Get all loaded URL IDs
  const loadedUrlIds = useMemo(() => {
    return Object.entries(state.urls)
      .filter(([_, urlState]) => urlState.isLoaded)
      .map(([id]) => id);
  }, [state.urls]);

  // Find current group based on active URL
  const currentGroup = useMemo(() => {
    if (!state.activeUrlId) return urlGroups[0] || null;

    return (
      urlGroups.find((group) => group.urls.some((url) => url.id === state.activeUrlId)) || null
    );
  }, [urlGroups, state.activeUrlId]);

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      activeUrlId: state.activeUrlId,
      initialUrlId: state.initialUrlId,
      urls: state.urls,
      loadedUrlIds,
      currentGroup,
      initializeUrls,
      selectUrl,
      unloadUrl,
    }),
    [
      state.activeUrlId,
      state.initialUrlId,
      state.urls,
      loadedUrlIds,
      currentGroup,
      initializeUrls,
      selectUrl,
      unloadUrl,
    ],
  );
}

/**
 * Hook for managing lifecycle of a specific iframe
 *
 * @param urlId - ID of the URL to manage lifecycle for
 * @returns Object with lifecycle state and handlers
 */
export function useIframeLifecycle(urlId: string) {
  const { state, dispatch } = useIframeState();
  const urlState = state.urls[urlId];

  // Mark URL as loaded
  const handleLoad = useCallback(() => {
    dispatch({ type: "LOAD_URL", payload: { urlId } });
  }, [dispatch, urlId]);

  // Set error state for URL
  const handleError = useCallback(
    (error: string) => {
      dispatch({ type: "SET_ERROR", payload: { urlId, error } });
    },
    [dispatch, urlId],
  );

  // Clear error state
  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: { urlId, error: null } });
  }, [dispatch, urlId]);

  // Check if URL is active
  const isActive = state.activeUrlId === urlId;

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      isLoaded: urlState?.isLoaded ?? false,
      isVisible: urlState?.isVisible ?? false,
      isActive,
      error: urlState?.error ?? null,
      retryCount: urlState?.retryCount ?? 0,
      handleLoad,
      handleError,
      clearError,
    }),
    [
      urlState?.isLoaded,
      urlState?.isVisible,
      isActive,
      urlState?.error,
      urlState?.retryCount,
      handleLoad,
      handleError,
      clearError,
    ],
  );
}

/**
 * Hook for long-press gesture handling
 *
 * @param options - Configuration options
 * @returns Object with event handlers and progress
 */
export function useLongPress({
  onLongPress,
  duration = 2000,
  delayStart = 300,
}: {
  onLongPress: () => void;
  duration?: number;
  delayStart?: number;
}) {
  const [progress, setProgress] = useState<number>(0);

  const handlers = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startTime = 0;
    let animationFrame: number | null = null;

    // Start long press
    const handleMouseDown = () => {
      startTime = Date.now() + delayStart;

      // Clear any existing timers
      if (timer) clearTimeout(timer);
      if (animationFrame) cancelAnimationFrame(animationFrame);

      // Start progress tracking
      const updateProgress = () => {
        const now = Date.now();
        if (now < startTime) {
          setProgress(0);
          animationFrame = requestAnimationFrame(updateProgress);
          return;
        }

        const elapsed = now - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);

        if (newProgress < 1) {
          animationFrame = requestAnimationFrame(updateProgress);
        } else {
          // Execute long press action
          onLongPress();
        }
      };

      animationFrame = requestAnimationFrame(updateProgress);
    };

    // Cancel long press
    const handleCancel = () => {
      if (timer) clearTimeout(timer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      setProgress(0);
    };

    return {
      handleMouseDown,
      handleMouseUp: handleCancel,
      handleMouseLeave: handleCancel,
    };
  }, [onLongPress, duration, delayStart, setProgress]);

  return useMemo(
    () => ({
      ...handlers,
      progress,
    }),
    [handlers, progress],
  );
}
