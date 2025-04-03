"use client";

import { MenuBar } from "@/app/components/ui/MenuBar";
import { useUrlManager } from "@/app/lib/hooks/useIframe";
import { Url } from "@/app/lib/types";
import { memo, useCallback, useMemo } from "react";

interface MenuBarAdapterProps {
  urlGroups: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    urls: Array<{
      id: string;
      title: string;
      url: string;
      urlMobile?: string | null;
      iconPath?: string | null;
      idleTimeoutMinutes?: number | null;
      displayOrder: number;
      createdAt?: string | Date;
      updatedAt?: string | Date;
    }>;
  }>;
  menuPosition?: "top" | "side";
}

interface TransformedUrlGroup {
  id: string;
  name: string;
  description: string | null;
  urls: Array<{
    url: {
      id: string;
      title: string;
      url: string;
      urlMobile: string | null;
      iconPath: string | null;
      idleTimeoutMinutes?: number;
      displayOrder: number;
      createdAt: string;
      updatedAt: string;
    };
    displayOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
  urlCount: number;
}

/**
 * MenuBarAdapter component
 *
 * This adapter connects the existing MenuBar component with our iframe state system.
 * It transforms the state format from our context to what MenuBar expects.
 *
 * Visibility behavior:
 * - No groups: Hides group selector
 * - Single group and Multiple groups handled in MenuBar component
 */
const MenuBarAdapter = memo(function MenuBarAdapter({
  urlGroups,
  menuPosition,
}: MenuBarAdapterProps) {
  // Get URL management functions from the new hook
  const {
    activeUrlId,
    urls,
    selectUrl,
    unloadUrl,
    // , reloadUrl // TODO: add reloadUrl
  } = useUrlManager(urlGroups);

  // Add validation for urlGroups
  if (!Array.isArray(urlGroups)) {
    return null;
  }

  // Memoize URL group transformation
  const transformedGroups = useMemo(() => {
    return urlGroups
      .filter((group): group is NonNullable<typeof group> => {
        if (!group || typeof group !== "object") {
          return false;
        }

        if (!group.id || !group.name || !Array.isArray(group.urls)) {
          return false;
        }

        return true;
      })
      .map((group) => {
        const validUrls = group.urls
          .filter((url): url is NonNullable<typeof url> => {
            if (!url || !url.id || !url.title || !url.url) {
              return false;
            }
            return true;
          })
          .map((url) => ({
            url: {
              id: url.id,
              title: url.title,
              url: url.url,
              urlMobile: url.urlMobile || null,
              iconPath: url.iconPath || null,
              idleTimeoutMinutes: url.idleTimeoutMinutes || undefined,
              displayOrder: url.displayOrder,
              createdAt: url.createdAt
                ? new Date(url.createdAt).toISOString()
                : new Date().toISOString(),
              updatedAt: url.updatedAt
                ? new Date(url.updatedAt).toISOString()
                : new Date().toISOString(),
            },
            displayOrder: url.displayOrder,
          }));

        return {
          id: group.id,
          name: group.name,
          description: group.description || null,
          createdAt: group.createdAt
            ? new Date(group.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: group.updatedAt
            ? new Date(group.updatedAt).toISOString()
            : new Date().toISOString(),
          urlCount: validUrls.length,
          urls: validUrls,
        };
      });
  }, [urlGroups]);

  // Handle URL click with stable reference
  const handleUrlClick = useCallback(
    (url: Url) => {
      if (activeUrlId === url.id) {
        // Re-select the URL to trigger a reload
        selectUrl(url.id);
      } else {
        selectUrl(url.id);
      }
    },
    [activeUrlId, selectUrl],
  );

  // Handle URL reload with stable reference
  const handleUrlReload = useCallback(
    (url: Url) => {
      // Re-select the URL to trigger a reload
      selectUrl(url.id);
    },
    [selectUrl],
  );

  // Handle URL unload with stable reference
  const handleUrlUnload = useCallback(
    (url: Url) => {
      unloadUrl(url.id);
    },
    [unloadUrl],
  );

  // Get loaded URL IDs from the urls state
  const loadedUrlIds = useMemo(() => {
    return Object.entries(urls)
      .filter(([_, state]) => state.isLoaded)
      .map(([id]) => id);
  }, [urls]);

  // Memoize MenuBar props with stable reference
  const menuBarProps = useMemo(
    () => ({
      urlGroups: transformedGroups,
      activeUrlId,
      loadedUrlIds,
      onUrlClick: handleUrlClick,
      onUrlReload: handleUrlReload,
      onUrlUnload: handleUrlUnload,
      menuPosition,
    }),
    [
      transformedGroups,
      activeUrlId,
      loadedUrlIds,
      handleUrlClick,
      handleUrlReload,
      handleUrlUnload,
      menuPosition,
    ],
  );

  return <MenuBar {...menuBarProps} />;
});

export { MenuBarAdapter };
