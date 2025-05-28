"use client";

import type { UrlGroup } from "@/app/types/iframe";
import { useCallback, useEffect, useState } from "react";

export function useUrlGroups() {
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUrlGroups = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch URL groups from the API
      const response = await fetch("/api/url-groups");

      if (!response.ok) {
        throw new Error(`Failed to fetch URL groups: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform the data to match our expected format
      const transformedGroups: UrlGroup[] = data.urlGroups
        ? data.urlGroups.map((group: any) => ({
            id: group.id,
            name: group.name,
            urls: group.urls.map((url: any) => ({
              id: url.id,
              title: url.title,
              url: url.url,
              urlMobile: url.urlMobile || null,
              iconPath: url.iconPath || null,
              idleTimeoutMinutes: url.idleTimeoutMinutes || null,
              displayOrder: url.displayOrder || 0,
            })),
          }))
        : [];

      setUrlGroups(transformedGroups);
      setError(null);
    } catch (err) {
      console.error("Error fetching URL groups:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUrlGroups();
  }, [fetchUrlGroups]);

  return {
    urlGroups,
    isLoading,
    error,
    refetch: fetchUrlGroups,
  };
}
