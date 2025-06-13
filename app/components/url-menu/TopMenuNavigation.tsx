"use client";

import { useUrlManager } from "@/app/lib/hooks/useIframe";
import type { UrlGroup } from "@/app/types/iframe";
import { Box, Paper, Popper, useTheme } from "@mui/material";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UrlItem } from "./UrlItem";

interface TopMenuNavigationProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
}

export const TopMenuNavigation = memo(function TopMenuNavigation({
  urlGroups,
  initialUrlId,
  onUrlSelect,
}: TopMenuNavigationProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { urls, activeUrlId, selectUrl, unloadUrl } = useUrlManager(urlGroups, initialUrlId);

  // Find current group based on active URL
  const currentGroup = useMemo(() => {
    if (!activeUrlId) return urlGroups[0] || null;

    return (
      urlGroups.find((group) => group.urls.some((url) => url.id === activeUrlId)) || urlGroups[0]
    );
  }, [urlGroups, activeUrlId]);

  // Filter out the current group from expanded view
  const nonCurrentGroups = useMemo(() => {
    if (!currentGroup) return urlGroups;
    return urlGroups.filter((group) => group.id !== currentGroup.id);
  }, [urlGroups, currentGroup]);

  // Handle URL selection
  const handleUrlClick = useCallback(
    (urlId: string) => {
      selectUrl(urlId);
      if (onUrlSelect) onUrlSelect(urlId);
      setExpanded(false);
    },
    [selectUrl, onUrlSelect],
  );

  // Handle URL unload (long press)
  const handleUrlUnload = useCallback(
    (urlId: string) => {
      unloadUrl(urlId);
    },
    [unloadUrl],
  );

  // Handle hover to expand/collapse with delay
  const handleMouseEnter = useCallback(() => {
    // Only expand if there are multiple URL groups
    if (urlGroups.length <= 1) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setExpanded(true);
  }, [urlGroups.length]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setExpanded(false);
    }, 300);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Render URL item with appropriate state
  const renderUrlItem = useCallback(
    (url: UrlGroup["urls"][0]) => {
      const urlData = urls[url.id];
      const isActive = url.id === activeUrlId;
      const isLoaded = urlData?.isLoaded ?? false;

      // If url has a title property, use it; otherwise use the ID
      const urlTitle = (url as any).title || url.id;

      return (
        <UrlItem
          key={url.id}
          url={{
            id: url.id,
            title: urlTitle,
            url: url.url,
            urlMobile: url.urlMobile ?? null,
            iconPath: (url as any).iconPath || null,
            idleTimeoutMinutes: (url as any).idleTimeoutMinutes,
            displayOrder: (url as any).displayOrder || 0,
          }}
          isActive={isActive}
          isLoaded={isLoaded}
          tooltipText={url.url}
          onUrlClick={() => handleUrlClick(url.id)}
          onLongPress={() => handleUrlUnload(url.id)}
          menuPosition="top"
          theme={theme}
        />
      );
    },
    [urls, activeUrlId, handleUrlClick, handleUrlUnload, theme],
  );

  // Reusable component for rendering a group of URLs in a horizontal row
  const GroupUrlRow = useCallback(
    ({ group }: { group: UrlGroup }) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          overflow: "auto",
          whiteSpace: "nowrap",
          backgroundColor: theme.palette.background.paper,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": { backgroundColor: theme.palette.divider },
        }}
      >
        {group.urls.map(renderUrlItem)}
      </Box>
    ),
    [renderUrlItem, theme.palette.divider, theme.palette.background.paper],
  );

  // Only render if we have groups
  if (!urlGroups.length || !currentGroup) {
    return null;
  }

  // The AppBar in AppLayout.tsx uses theme.palette.background.paper
  const headerBgColor = theme.palette.background.paper;

  return (
    <Box
      ref={anchorRef}
      sx={{
        display: "flex",
        flexGrow: 1,
        alignItems: "center",
        height: "100%",
        overflow: "hidden",
        backgroundColor: headerBgColor,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Normal state - current group + URLs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          px: 2,
          backgroundColor: headerBgColor, // Ensure this Box also has the same background
        }}
      >
        {/* Group name - only show if there's more than one group */}
        {urlGroups.length > 1 && (
          <Box
            sx={{
              mr: 2,
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {currentGroup.name}
          </Box>
        )}

        {/* Horizontal URL row for current group */}
        <GroupUrlRow group={currentGroup} />
      </Box>

      {/* Expanded view - non-current groups - Only show if there are multiple groups */}
      {urlGroups.length > 1 && (
        <Popper
          open={expanded}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          disablePortal
          modifiers={[
            {
              name: "offset",
              options: {
                offset: [0, 0], // Remove the gap between header and dropdown
              },
            },
            {
              name: "preventOverflow",
              options: {
                padding: 8, // Add padding to prevent overflow
              },
            },
          ]}
          sx={{
            zIndex: theme.zIndex.appBar + 1,
            // Width based on content rather than matching header width
            minWidth: "fit-content",
            maxWidth: "100%",
            backgroundColor: headerBgColor, // Match exact header color
            boxShadow: theme.shadows[3],
            borderRadius: "0 0 4px 4px", // Only round the bottom corners
            overflow: "hidden",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              backgroundColor: headerBgColor, // Match exact header color
              backgroundImage: "none", // Remove any gradient or image
              maxHeight: "calc(100vh - 200px)",
              overflow: "auto",
              p: 1,
              borderRadius: 0, // Remove any border radius from paper
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Only show non-current groups in the expanded view */}
            {nonCurrentGroups.map((group) => (
              <Box
                key={group.id}
                sx={{
                  mb: 2,
                  "&:last-child": { mb: 0 },
                  py: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  {/* Group name */}
                  <Box
                    sx={{
                      mr: 2,
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.name}
                  </Box>

                  {/* Horizontal URL row for this non-current group */}
                  <GroupUrlRow group={group} />
                </Box>
              </Box>
            ))}
          </Paper>
        </Popper>
      )}
    </Box>
  );
});
