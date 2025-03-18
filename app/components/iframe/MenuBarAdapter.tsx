"use client";

import { useCallback, useEffect } from "react";
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
  const { states, activeUrlId, unloadIframe, reloadIframe, getLoadedUrlIds } = useIframeContext();

  // Transform states to loadedUrlIds array for MenuBar
  const loadedUrlIds = getLoadedUrlIds();

  // Add logging to track states
  useEffect(() => {
    console.log("--- MenuBarAdapter State Log ---");
    console.log("Active URL ID:", activeUrlId);
    console.log("Loaded URL IDs:", loadedUrlIds);
    console.log("All iframe states:", states);

    // Log individual URL states
    urlGroups.forEach((group) => {
      group.urls.forEach((url) => {
        const state = states[url.id];
        const isLoaded = loadedUrlIds.includes(url.id);
        console.log(`URL ${url.id} (${url.title}):`, {
          inLoadedArray: isLoaded,
          stateStatus: state?.status || "unknown",
          isActive: url.id === activeUrlId,
        });
      });
    });
  }, [activeUrlId, loadedUrlIds, states, urlGroups]);

  // Handle URL click
  const handleUrlClick = useCallback(
    (url: Url) => {
      console.log("URL Click:", url.id, url.title);
      // If this is already the active URL, reload it
      if (url.id === activeUrlId) {
        console.log("Reloading active URL:", url.id);
        reloadIframe(url.id);
      } else {
        // We need to make this URL active
        console.log("Setting new active URL:", url.id);
        // For now we can just mark it as active-loaded in our state
        reloadIframe(url.id);
      }
    },
    [activeUrlId, reloadIframe],
  );

  // Handle URL reload
  const handleUrlReload = useCallback(
    (url: Url) => {
      console.log("URL Reload:", url.id, url.title);
      reloadIframe(url.id);
    },
    [reloadIframe],
  );

  // Handle URL unload
  const handleUrlUnload = useCallback(
    (url: Url) => {
      console.log("URL Unload:", url.id, url.title);
      unloadIframe(url.id);
    },
    [unloadIframe],
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
