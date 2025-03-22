"use client";

import { useIframeContext } from "@/app/components/iframe/state/IframeContext";
import MenuBar from "@/app/components/ui/MenuBar";
import { Url, UrlGroup } from "@/app/lib/types";
import { useCallback } from "react";

interface MenuBarAdapterProps {
  urlGroups: UrlGroup[];
  menuPosition?: "side" | "top";
}

/**
 * MenuBarAdapter component
 *
 * This adapter connects the existing MenuBar component with our new IframeContext state system.
 * It transforms the state format from our new context to what MenuBar expects.
 *
 * Visibility behavior:
 * - No groups: Hides group selector
 * - Single group and Multiple groups handled in MenuBar component
 */
export function MenuBarAdapter({ urlGroups, menuPosition }: MenuBarAdapterProps) {
  const { states, activeUrlId, dispatch } = useIframeContext();

  // Get loaded URL IDs from iframe states
  const loadedUrlIds = Object.entries(states)
    .filter(([, state]) => state.status.includes("loaded"))
    .map(([id]) => id);

  // Determine group visibility state
  const hasNoGroups = urlGroups.length === 0;

  // Handle URL click
  const handleUrlClick = useCallback(
    (url: Url) => {
      const currentState = states[url.id];

      if (currentState?.status === "active-loaded") {
        // If already active and loaded, trigger reload
        dispatch({ type: "RELOAD_URL", payload: { urlId: url.id } });
      } else {
        // Set as active URL
        dispatch({ type: "SET_ACTIVE_URL", payload: { urlId: url.id } });

        // If unloaded, trigger load
        if (currentState?.status.includes("unloaded")) {
          dispatch({ type: "LOAD_URL", payload: { urlId: url.id } });
        }
      }
    },
    [states, dispatch],
  );

  // Handle URL reload
  const handleUrlReload = useCallback(
    (url: Url) => {
      dispatch({ type: "RELOAD_URL", payload: { urlId: url.id } });
    },
    [dispatch],
  );

  // Handle URL unload
  const handleUrlUnload = useCallback(
    (url: Url) => {
      dispatch({ type: "UNLOAD_URL", payload: { urlId: url.id } });
    },
    [dispatch],
  );

  // Render appropriate group selector based on number of groups
  const renderGroupSelector = () => {
    if (hasNoGroups || menuPosition === undefined || !menuPosition) {
      return null; // Hide selector when no groups or menuPosition is undefined
    }

    return (
      <MenuBar
        urlGroups={urlGroups}
        loadedUrlIds={loadedUrlIds}
        activeUrlId={activeUrlId}
        onUrlClick={handleUrlClick}
        onUrlReload={handleUrlReload}
        menuPosition={menuPosition}
      />
    );
  };

  return renderGroupSelector();
}

export default MenuBarAdapter;
