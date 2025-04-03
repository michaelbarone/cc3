"use client";

import { useIframeState } from "@/app/lib/state/iframe-state";
import { useCallback, useEffect, useRef } from "react";

interface UseIdleTimeoutProps {
  urlId: string;
  timeoutMinutes: number;
  onTimeout?: (urlId: string) => void;
  isActive: boolean;
}

interface UseIdleTimeoutReturn {
  resetTimer: () => void;
  getRemainingTime: () => number;
}

export function useIdleTimeout({
  urlId,
  timeoutMinutes,
  onTimeout,
  isActive,
}: UseIdleTimeoutProps): UseIdleTimeoutReturn {
  const { state, dispatch } = useIframeState();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearIdleTimeout();

    // Update activity timestamp by selecting the URL again
    dispatch({
      type: "SELECT_URL",
      payload: { urlId },
    });

    // Start a new timer if timeout is enabled and the iframe is not active
    if (timeoutMinutes > 0 && !isActive) {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      timeoutRef.current = setTimeout(() => {
        onTimeout?.(urlId);
      }, timeoutMs);
    }
  }, [urlId, timeoutMinutes, dispatch, clearIdleTimeout, isActive, onTimeout]);

  // Calculate remaining time until timeout
  const getRemainingTime = useCallback(() => {
    const url = state.urls[urlId];
    if (!url || timeoutMinutes <= 0) return Infinity;

    // Since we don't have direct access to lastActivity, we'll use the URL's state
    // If the URL is loaded and visible, consider it active
    if (url.isLoaded && url.isVisible) {
      return timeoutMinutes * 60 * 1000; // Full timeout duration
    }

    return 0; // Timeout expired
  }, [state.urls, urlId, timeoutMinutes]);

  // Set up the timeout when parameters change
  useEffect(() => {
    // Don't set up timeout for active iframes or when timeout is disabled
    if (isActive || timeoutMinutes <= 0) {
      clearIdleTimeout();
      return;
    }

    // Calculate when the timeout should fire
    const remainingTime = getRemainingTime();

    // Only set a timeout if the remaining time is finite
    if (remainingTime < Infinity) {
      clearIdleTimeout();
      timeoutRef.current = setTimeout(() => {
        onTimeout?.(urlId);
      }, remainingTime);
    }

    return clearIdleTimeout;
  }, [urlId, timeoutMinutes, isActive, clearIdleTimeout, getRemainingTime, onTimeout]);

  // Reset timer on mount
  useEffect(() => {
    resetTimer();
    return clearIdleTimeout;
  }, [resetTimer, clearIdleTimeout]);

  return {
    resetTimer,
    getRemainingTime,
  };
}
