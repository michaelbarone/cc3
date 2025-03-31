"use client";

import { MenuBar } from "@/app/components/ui/MenuBar";
import { useIframeState } from "@/app/lib/state/iframe-state-context";
import { Url } from "@/app/lib/types";
import { useCallback } from "react";

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
 * This adapter connects the existing MenuBar component with our new IframeContext state system.
 * It transforms the state format from our new context to what MenuBar expects.
 *
 * Visibility behavior:
 * - No groups: Hides group selector
 * - Single group and Multiple groups handled in MenuBar component
 */
export function MenuBarAdapter({ urlGroups, menuPosition }: MenuBarAdapterProps) {
  const { activeUrlId, loadedUrlIds, setActiveUrl, reloadIframe, unloadIframe } = useIframeState();

  // Debug incoming data
  console.log("Incoming urlGroups:", JSON.stringify(urlGroups, null, 2));

  // Add validation for urlGroups
  if (!Array.isArray(urlGroups)) {
    console.warn("urlGroups is not an array:", urlGroups);
    return null;
  }

  // Transform URL groups to match MenuBar's expected format
  const transformedGroups: TransformedUrlGroup[] = urlGroups
    .filter((group): group is NonNullable<typeof group> => {
      if (!group || typeof group !== "object") {
        console.warn("Invalid group data:", group);
        return false;
      }

      if (!group.id || !group.name || !Array.isArray(group.urls)) {
        console.warn("Missing required group fields:", group);
        return false;
      }

      // Debug group data
      console.log(`Group validation for ${group.name}:`, {
        id: group.id,
        urlCount: group.urls.length,
        hasRequiredFields: Boolean(group.id && group.name && Array.isArray(group.urls)),
      });

      return true;
    })
    .map((group) => {
      // Debug before URL processing
      console.log(`Processing URLs for group ${group.name}:`, {
        groupId: group.id,
        urlCount: group.urls.length,
        urls: group.urls.map((url) => ({
          id: url.id,
          title: url.title,
          hasUrl: Boolean(url.url),
        })),
      });

      const validUrls = group.urls
        .filter((url): url is NonNullable<typeof url> => {
          if (!url) {
            console.warn(`Group ${group.name}: URL is null or undefined`);
            return false;
          }

          const isValid = Boolean(url.id && url.title && url.url);
          if (!isValid) {
            console.warn(`Group ${group.name}: Invalid URL:`, {
              id: url.id,
              title: url.title,
              url: url.url,
              hasRequiredFields: isValid,
            });
          }
          return isValid;
        })
        .map((url) => {
          return {
            url: {
              id: url.id,
              title: url.title,
              url: url.url,
              urlMobile: url.urlMobile || null,
              iconPath: url.iconPath || null,
              idleTimeoutMinutes: url.idleTimeoutMinutes || undefined,
              displayOrder: url.displayOrder,
              createdAt: url.createdAt ? new Date(url.createdAt).toISOString() : "",
              updatedAt: url.updatedAt ? new Date(url.updatedAt).toISOString() : "",
            },
            displayOrder: url.displayOrder,
          };
        });

      // Debug transformed URLs
      console.log(`Final URLs for group ${group.name}:`, {
        groupId: group.id,
        validUrlCount: validUrls.length,
        urls: validUrls.map((u) => ({
          id: u.url.id,
          title: u.url.title,
        })),
      });

      return {
        id: group.id,
        name: group.name,
        description: group.description || null,
        createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : "",
        updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : "",
        urlCount: validUrls.length,
        urls: validUrls,
      };
    });

  // Debug final transformed groups
  console.log("MenuBarAdapter final groups:", {
    originalCount: urlGroups.length,
    transformedCount: transformedGroups.length,
    groups: transformedGroups.map((g) => ({
      id: g.id,
      name: g.name,
      urlCount: g.urls.length,
    })),
  });

  // Handle URL click
  const handleUrlClick = useCallback(
    (url: Url) => {
      if (activeUrlId === url.id) {
        reloadIframe(url.id);
      } else {
        setActiveUrl(url);
      }
    },
    [activeUrlId, reloadIframe, setActiveUrl],
  );

  // Handle URL reload
  const handleUrlReload = useCallback(
    (url: Url) => {
      reloadIframe(url.id);
    },
    [reloadIframe],
  );

  // Handle URL unload
  const handleUrlUnload = useCallback(
    (url: Url) => {
      unloadIframe(url.id);
    },
    [unloadIframe],
  );

  // Add validation before rendering MenuBar
  if (transformedGroups.length === 0) {
    console.warn("No valid groups after transformation");
    return null;
  }

  return (
    <MenuBar
      urlGroups={transformedGroups}
      loadedUrlIds={loadedUrlIds}
      activeUrlId={activeUrlId}
      onUrlClick={handleUrlClick}
      onUrlReload={handleUrlReload}
      onUrlUnload={handleUrlUnload}
      menuPosition={menuPosition}
    />
  );
}

export default MenuBarAdapter;
