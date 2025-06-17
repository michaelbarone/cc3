"use client";

import { useUrlGroups } from "@/app/lib/hooks/useUrlGroups";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { useMediaQuery, useTheme } from "@mui/material";
import { TopMenuNavigation } from "./TopMenuNavigation";
import { UrlMenu } from "./UrlMenu";

interface AppMenuContentProps {
  forceMenuPosition?: "side" | "top" | null;
  initialUrlId?: string | null;
}

export function AppMenuContent({
  forceMenuPosition = null,
  initialUrlId = null,
}: AppMenuContentProps) {
  const theme = useTheme();
  const { preferences } = useUserPreferences();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { urlGroups, isLoading, error } = useUrlGroups();

  // Determine effective menu position based on user preferences and device
  const effectiveMenuPosition = (() => {
    // Mobile always uses side menu
    if (isMobile) return "side";

    // Use forced position if provided
    if (forceMenuPosition) return forceMenuPosition;

    // Use user preference or default to "top"
    return preferences?.menuPosition || "top";
  })();

  // Handle loading and error states
  if (isLoading) return null;
  if (error) return null;
  if (!urlGroups || urlGroups.length === 0) return null;

  // Render menu based on effective position
  if (effectiveMenuPosition === "top" && !isMobile) {
    return <TopMenuNavigation urlGroups={urlGroups} initialUrlId={initialUrlId || undefined} />;
  }

  // Default to side menu
  return <UrlMenu urlGroups={urlGroups} initialUrlId={initialUrlId || undefined} />;
}
