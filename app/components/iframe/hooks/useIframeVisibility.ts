"use client";

import { useEffect, useCallback } from "react";
import { useGlobalIframeContainer } from "./useGlobalIframeContainer";
import { useIframeContext } from "../state/IframeContext";
import { IframeStatus } from "@/app/types/iframe";

interface UseIframeVisibilityProps {
  urlId: string;
  isActive: boolean;
}

interface UseIframeVisibilityReturn {
  showIframe: () => void;
  hideIframe: () => void;
}

export function useIframeVisibility({
  urlId,
  isActive,
}: UseIframeVisibilityProps): UseIframeVisibilityReturn {
  const { updateIframeVisibility } = useGlobalIframeContainer();
  const { states, dispatch } = useIframeContext();

  // Update visibility based on active state
  useEffect(() => {
    updateIframeVisibility(urlId, isActive);

    // Update status based on visibility
    if (isActive) {
      // When activating an iframe, maintain loaded/unloaded state but change to active
      const currentState = states[urlId];
      if (currentState) {
        const newStatus: IframeStatus =
          currentState.status === "inactive-loaded"
            ? "active-loaded"
            : currentState.status === "inactive-unloaded"
              ? "active-unloaded"
              : currentState.status; // Keep current state if already active

        dispatch({
          type: "SET_STATUS",
          payload: { urlId, status: newStatus },
        });
      }
    } else {
      // When deactivating an iframe, maintain loaded/unloaded state but change to inactive
      const currentState = states[urlId];
      if (currentState) {
        const newStatus: IframeStatus =
          currentState.status === "active-loaded"
            ? "inactive-loaded"
            : currentState.status === "active-unloaded"
              ? "inactive-unloaded"
              : currentState.status; // Keep current state if already inactive

        dispatch({
          type: "SET_STATUS",
          payload: { urlId, status: newStatus },
        });
      }
    }
  }, [urlId, isActive, updateIframeVisibility, states, dispatch]);

  // Explicitly show iframe
  const showIframe = useCallback(() => {
    updateIframeVisibility(urlId, true);

    const currentState = states[urlId];
    if (currentState) {
      const newStatus: IframeStatus =
        currentState.status === "inactive-loaded"
          ? "active-loaded"
          : currentState.status === "inactive-unloaded"
            ? "active-unloaded"
            : currentState.status;

      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: newStatus },
      });
    }
  }, [urlId, updateIframeVisibility, states, dispatch]);

  // Explicitly hide iframe
  const hideIframe = useCallback(() => {
    updateIframeVisibility(urlId, false);

    const currentState = states[urlId];
    if (currentState) {
      const newStatus: IframeStatus =
        currentState.status === "active-loaded"
          ? "inactive-loaded"
          : currentState.status === "active-unloaded"
            ? "inactive-unloaded"
            : currentState.status;

      dispatch({
        type: "SET_STATUS",
        payload: { urlId, status: newStatus },
      });
    }
  }, [urlId, updateIframeVisibility, states, dispatch]);

  return {
    showIframe,
    hideIframe,
  };
}
