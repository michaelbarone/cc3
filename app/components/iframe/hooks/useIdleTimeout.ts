"use client";

import { useCallback, useEffect, useRef } from "react";
import { useIframeContext } from "../state/IframeContext";

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
  const { states, dispatch } = useIframeContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearIdleTimeout();

    // Update activity timestamp in state
    dispatch({
      type: "UPDATE_ACTIVITY",
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
    const state = states[urlId];
    if (!state || timeoutMinutes <= 0) return Infinity;

    const elapsedMs = Date.now() - state.lastActivity;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const remainingMs = Math.max(0, timeoutMs - elapsedMs);

    return remainingMs;
  }, [states, urlId, timeoutMinutes]);

  // Set up the timeout when parameters change
  useEffect(() => {
    // Update idle timeout in state
    dispatch({
      type: "SET_IDLE_TIMEOUT",
      payload: { urlId, minutes: timeoutMinutes },
    });

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
  }, [urlId, timeoutMinutes, isActive, clearIdleTimeout, dispatch, getRemainingTime, onTimeout]);

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
