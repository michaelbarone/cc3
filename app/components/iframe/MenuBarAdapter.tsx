"use client";

import { useCallback } from "react";
import MenuBar from "@/app/components/ui/MenuBar";
import { useIframeContext } from "@/app/components/iframe/state/IframeContext";
import { Url, UrlGroup } from "@/app/lib/types";

interface MenuBarAdapterProps {
  urlGroups: UrlGroup[];
  menuPosition?: "side" | "top";
}

/**
 * MenuBarAdapter component
 *
 * This adapter connects the existing MenuBar component with our new IframeContext state system.
 * It transforms the state format from our new context to what MenuBar expects.
 */
export function MenuBarAdapter({ urlGroups, menuPosition }: MenuBarAdapterProps) {
  const { states, activeUrlId, dispatch } = useIframeContext();

  // Get loaded URL IDs from iframe states
  const loadedUrlIds = Object.entries(states)
    .filter(([, state]) => state.status.includes("loaded"))
    .map(([id]) => id);

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

  return (
    <MenuBar
      urlGroups={urlGroups}
      activeUrlId={activeUrlId}
      loadedUrlIds={loadedUrlIds}
      onUrlClick={handleUrlClick}
      onUrlReload={handleUrlReload}
      onUrlUnload={handleUrlUnload}
      menuPosition={menuPosition}
    />
  );
}

export default MenuBarAdapter;
