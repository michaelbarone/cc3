"use client";

import { useIframeManager } from "@/app/contexts/IframeProvider";
import { Box, ClickAwayListener, Paper, Popper, Typography, useTheme } from "@mui/material";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Url {
  id: string;
  urlId: string;
  title: string;
  url: string;
  faviconUrl: string | null;
  displayOrderInGroup: number;
}

interface UrlGroup {
  id: string;
  name: string;
  urls: Url[];
}

interface TopMenuNavigationProps {
  groups: UrlGroup[];
  selectedGroupId: string | null;
  onGroupChange: (groupId: string) => void;
}

/**
 * Component that displays the top menu navigation for desktop/tablet view
 */
export default function TopMenuNavigation({
  groups,
  selectedGroupId,
  onGroupChange,
}: TopMenuNavigationProps) {
  const theme = useTheme();
  const { isUrlLoaded, activeUrlIdentifier, setActiveUrl } = useIframeManager();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [popperOpen, setPopperOpen] = useState(false);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<UrlGroup | null>(null);
  const popperTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Find the selected group from the groups array
  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSelectedGroup(group);
      } else if (groups.length > 0) {
        // If selected group not found, select the first group
        setSelectedGroup(groups[0]);
        onGroupChange(groups[0].id);
      }
    } else if (groups.length > 0) {
      // If no group is selected, select the first group
      setSelectedGroup(groups[0]);
      onGroupChange(groups[0].id);
    }
  }, [selectedGroupId, groups, onGroupChange]);

  // Handle URL item click
  const handleUrlClick = useCallback(
    (urlId: string, url: string, groupId: string) => {
      setActiveUrl(urlId, url);
      // Close popper when a URL is clicked
      setPopperOpen(false);
      // Update the selected group
      const group = groups.find((g) => g.id === groupId);
      if (group && group.id !== selectedGroupId) {
        onGroupChange(group.id);
      }
    },
    [groups, onGroupChange, selectedGroupId, setActiveUrl],
  );

  // Handle hover to open the popper
  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (popperTimeoutRef.current) {
      clearTimeout(popperTimeoutRef.current);
      popperTimeoutRef.current = null;
    }
    setAnchorEl(event.currentTarget);
    // Open popper immediately for better responsiveness
    setPopperOpen(true);
  };

  // Handle mouse leave to close the popper with delay
  const handleMouseLeave = () => {
    if (popperTimeoutRef.current) {
      clearTimeout(popperTimeoutRef.current);
    }
    // Set a delay before closing to prevent accidental closures
    popperTimeoutRef.current = setTimeout(() => {
      setPopperOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Handle click away to close the popper
  const handleClickAway = () => {
    setPopperOpen(false);
  };

  // Handle more menu open
  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMoreMenuAnchorEl(event.currentTarget);
  };

  // Handle more menu close
  const handleMoreMenuClose = () => {
    setMoreMenuAnchorEl(null);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (popperTimeoutRef.current) {
        clearTimeout(popperTimeoutRef.current);
      }
    };
  }, []);

  // Check if we need to show the more button for overflowing items
  const checkOverflow = useCallback((containerRef: HTMLDivElement | null, urls: Url[]) => {
    if (!containerRef || urls.length === 0) return [];

    const containerWidth = containerRef.offsetWidth;
    const children = Array.from(containerRef.children) as HTMLElement[];
    const totalWidth = children.reduce((sum, child) => sum + child.offsetWidth, 0);

    if (totalWidth > containerWidth) {
      // Calculate how many items can fit
      let currentWidth = 0;
      let visibleCount = 0;

      // Reserve space for the "More" button (approximately 48px)
      const reservedSpace = 48;
      const availableWidth = containerWidth - reservedSpace;

      for (let i = 0; i < children.length; i++) {
        currentWidth += children[i].offsetWidth;
        if (currentWidth > availableWidth) break;
        visibleCount++;
      }

      // Return the overflow items
      return urls.slice(visibleCount);
    }

    return []; // No overflow
  }, []);

  // Render URL items for normal view (horizontal row)
  const renderUrlItems = useCallback(
    (urls: Url[], inPopper = false) => {
      return urls.map((url) => {
        const isActive = activeUrlIdentifier === url.urlId;
        const isLoaded = isUrlLoaded(url.urlId);

        return (
          <Box
            key={url.id}
            onClick={() => handleUrlClick(url.urlId, url.url, selectedGroupId || "")}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.5,
              py: 1,
              mx: 0.5,
              borderRadius: 1,
              cursor: "pointer",
              opacity: isLoaded ? 1 : 0.5,
              borderBottom: isActive
                ? `2px solid ${theme.palette.primary.main}`
                : "2px solid transparent",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            {url.faviconUrl ? (
              <Box sx={{ mr: 1, width: 16, height: 16, position: "relative" }}>
                <Image
                  src={url.faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  style={{ objectFit: "contain" }}
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </Box>
            ) : null}
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 500 : 400,
                color: isActive ? theme.palette.primary.main : "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {url.title}
            </Typography>
          </Box>
        );
      });
    },
    [activeUrlIdentifier, isUrlLoaded, handleUrlClick, theme.palette, selectedGroupId],
  );

  // Memoize the group content for better performance
  const selectedGroupContent = useMemo(() => {
    if (!selectedGroup) return null;

    // Render the group name and URL items for the selected group
    return (
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ display: "flex", alignItems: "center", height: "100%" }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            px: 2,
            cursor: "pointer",
            borderBottom: `2px solid ${theme.palette.primary.main}`,
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          {selectedGroup.name}
        </Typography>

        <Box
          ref={contentRef}
          sx={{
            display: "flex",
            overflowX: "auto",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {renderUrlItems(selectedGroup.urls)}
        </Box>
      </Box>
    );
  }, [selectedGroup, theme.palette, renderUrlItems, handleMouseEnter, handleMouseLeave]);

  // Expanded view in the popper
  const popperContent = useMemo(() => {
    if (!groups.length) return null;

    return (
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "60vh",
          overflow: "auto",
          mt: 0.5,
          p: 2,
        }}
      >
        {groups.map((group) => (
          <Box key={group.id} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 500,
                color: group.id === selectedGroupId ? theme.palette.primary.main : "inherit",
                mb: 1,
              }}
            >
              {group.name}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
              }}
            >
              {renderUrlItems(group.urls, true)}
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }, [groups, selectedGroupId, theme.palette, renderUrlItems]);

  // If no groups or the selected group has no URLs, show nothing
  if (!selectedGroup || selectedGroup.urls.length === 0) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: "relative", height: "100%" }}>
        {/* Selected group and its URLs */}
        {selectedGroupContent}

        {/* Expanded view popper */}
        <Popper
          open={popperOpen}
          anchorEl={anchorEl}
          placement="bottom-start"
          sx={{
            zIndex: theme.zIndex.appBar + 1,
            width: anchorEl?.offsetWidth,
            minWidth: 400,
          }}
          onMouseEnter={() => {
            if (popperTimeoutRef.current) {
              clearTimeout(popperTimeoutRef.current);
              popperTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
          transition
        >
          {popperContent}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
