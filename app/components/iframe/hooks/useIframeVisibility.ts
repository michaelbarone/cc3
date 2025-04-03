"use client";

import { useIframeState } from "@/app/lib/state/iframe-state";
import { useCallback, useEffect } from "react";
import { useGlobalIframeContainer } from "./useGlobalIframeContainer";

interface UseIframeVisibilityProps {
  urlId: string;
  isActive: boolean;
}

export function useIframeVisibility({ urlId, isActive }: UseIframeVisibilityProps) {
  const { dispatch } = useIframeState();
  const { updateIframeVisibility } = useGlobalIframeContainer();

  const updateVisibility = useCallback(() => {
    updateIframeVisibility(urlId, isActive);

    if (isActive) {
      // Mark URL as selected when visible
      dispatch({
        type: "SELECT_URL",
        payload: { urlId },
      });
    } else {
      // Mark URL as unloaded when hidden
      dispatch({
        type: "UNLOAD_URL",
        payload: { urlId },
      });
    }
  }, [urlId, isActive, dispatch, updateIframeVisibility]);

  useEffect(() => {
    updateVisibility();
  }, [updateVisibility]);

  return {
    updateVisibility,
  };
}
