"use client";

import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { useSelectedGroup } from "@/app/lib/state/selected-group-context";
import { Url } from "@/app/lib/types";
import { ArrowDropDown as ArrowDropDownIcon, Folder as FolderIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UrlItem } from "./UrlItem";

interface MenuBarProps {
  urlGroups: Array<{
    id: string;
    name: string;
    urls: Array<{
      url: Url;
      displayOrder: number;
    }>;
  }>;
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
  onUrlReload: (url: Url) => void;
  onUrlUnload: (url: Url) => void;
  menuPosition?: "top" | "side";
}

/**
 * URL Button States and Behaviors
 *
 * There are four possible states for URL buttons:
 *
 * 1. active-loaded:
 *    - Conditions: Currently selected URL with loaded content
 *    - Visual: Primary color text, bold, border indicator, green dot
 *    - Behavior:
 *      * Click: Reloads the content
 *      * Long press: Unloads the iframe content, changes state to active-unloaded
 *
 * 2. active-unloaded:
 *    - Conditions: Currently selected URL with no loaded content
 *    - Visual: Primary color text, bold, border indicator, no green dot
 *    - Behavior:
 *      * Click: Loads the content (sets iframe src), changes state to active-loaded
 *      * Long press: Not applicable (already unloaded)
 *
 * 3. inactive-loaded:
 *    - Conditions: Not selected URL but content is loaded in background
 *    - Visual: Normal text color, green dot
 *    - Behavior:
 *      * Click: Makes URL active and shows its content
 *      * Long press: Unloads the content (sets iframe src=""), changes state to inactive-unloaded
 *
 * 4. inactive-unloaded:
 *    - Conditions: Not selected URL and no loaded content
 *    - Visual: Normal text color, no indicators
 *    - Behavior:
 *      * Click: Makes URL active, loads content, changes state to active-loaded
 *      * Long press: Not applicable (already unloaded)
 */
const getUrlStatus = (
  urlId: string,
  activeUrlId: string | null,
  loadedUrlIds: string[],
): "active-loaded" | "active-unloaded" | "inactive-loaded" | "inactive-unloaded" => {
  const isActive = urlId === activeUrlId;
  // Explicitly check if the URL is in the loadedUrlIds array
  const isLoaded = Array.isArray(loadedUrlIds) && loadedUrlIds.includes(urlId);

  if (isActive) {
    return isLoaded ? "active-loaded" : "active-unloaded";
  } else {
    return isLoaded ? "inactive-loaded" : "inactive-unloaded";
  }
};

// Update the helper function with more detailed debugging
const convertUrlToOldFormat = (
  urlInGroup:
    | {
        url: {
          id: string;
          title: string;
          url: string;
          urlMobile: string | null;
          iconPath: string | null;
          idleTimeoutMinutes?: number;
          createdAt: Date;
          updatedAt: Date;
        };
        displayOrder: number;
      }
    | undefined,
): Url | null => {
  if (!urlInGroup) return null;
  if (!urlInGroup.url) return null;
  if (!urlInGroup.url.id || !urlInGroup.url.title || !urlInGroup.url.url) return null;

  return {
    ...urlInGroup.url,
    displayOrder: urlInGroup.displayOrder,
    createdAt: urlInGroup.url.createdAt.toISOString(),
    updatedAt: urlInGroup.url.updatedAt.toISOString(),
    idleTimeoutMinutes: urlInGroup.url.idleTimeoutMinutes,
  };
};

export function MenuBar({
  urlGroups,
  activeUrlId,
  loadedUrlIds = [],
  onUrlClick,
  onUrlReload,
  onUrlUnload,
  menuPosition = "top",
}: MenuBarProps) {
  const theme = useTheme();
  const { selectedGroupId, setSelectedGroupId } = useSelectedGroup();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { preferences } = useUserPreferences();
  const [isLongPressInProgress, setIsLongPressInProgress] = useState(false);

  // Get the currently selected group
  const selectedGroup = useMemo(() => {
    // If we have a selectedGroupId and it exists in urlGroups, use it
    if (selectedGroupId) {
      const selected = urlGroups.find((group) => group.id === selectedGroupId);
      if (selected) return selected;
    }

    // Otherwise use the first group
    return urlGroups[0];
  }, [urlGroups, selectedGroupId]);

  // Select first group by default or use last selected group
  useEffect(() => {
    if (!urlGroups.length) return;

    // Only set the first group if we don't have a valid selection
    if (!selectedGroupId || !urlGroups.find((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(urlGroups[0].id);
    }
  }, [urlGroups, selectedGroupId, setSelectedGroupId]);

  const handleGroupSelect = useCallback(
    (groupId: string) => {
      // Verify the group exists before setting it
      if (urlGroups.some((g) => g.id === groupId)) {
        setSelectedGroupId(groupId);
        setAnchorEl(null);
      }
    },
    [setSelectedGroupId, urlGroups],
  );

  const handleGroupMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleGroupMenuClose = () => {
    setAnchorEl(null);
  };

  const getUrlStatus = (urlId: string): string => {
    const isActive = urlId === activeUrlId;
    const isLoaded = loadedUrlIds.includes(urlId);
    return isActive
      ? isLoaded
        ? "active-loaded"
        : "active-unloaded"
      : isLoaded
        ? "inactive-loaded"
        : "inactive-unloaded";
  };

  const getTooltipText = (url: Url, status: string): string => {
    const statusText =
      status === "active-loaded"
        ? "Active"
        : status === "active-unloaded"
          ? "Loading..."
          : status === "inactive-loaded"
            ? "Loaded"
            : "Not Loaded";
    return `${url.title} (${statusText})`;
  };

  const handleUrlLongPress = (url: Url) => {
    setIsLongPressInProgress(true);
    onUrlReload(url);
    setTimeout(() => setIsLongPressInProgress(false), 1000);
  };

  // Render the group selector
  const renderGroupSelector = () => {
    const otherGroups = urlGroups.filter((group) => group.id !== selectedGroup?.id);

    return (
      <>
        <Button
          onClick={handleGroupMenuOpen}
          sx={{
            color: "inherit",
            textTransform: "none",
            minWidth: "auto",
            px: 1,
          }}
        >
          <ListItemIcon sx={{ minWidth: "auto", mr: 1 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={selectedGroup?.name || "Select Group"} />
          <ArrowDropDownIcon />
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleGroupMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          {otherGroups.map((group) => (
            <MenuItem key={group.id} onClick={() => handleGroupSelect(group.id)}>
              {group.name}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  // Render URLs for the selected group
  const renderUrls = () => {
    if (!selectedGroup) return null;

    return selectedGroup.urls.map((urlInGroup) => {
      const url = urlInGroup.url;
      const status = getUrlStatus(url.id);
      const isActive = status.startsWith("active");
      const isLoaded = status.endsWith("loaded");

      return (
        <UrlItem
          key={url.id}
          url={url}
          isActive={isActive}
          isLoaded={isLoaded}
          tooltipText={getTooltipText(url, status)}
          onUrlClick={() => onUrlClick(url)}
          onLongPress={() => handleUrlLongPress(url)}
          menuPosition={menuPosition}
          theme={theme}
        />
      );
    });
  };

  // Determine effective menu position
  const menuPositionEffective = useMemo(() => {
    if (isSmallScreen) return "side";
    if (menuPosition === "top" || menuPosition === "side") return menuPosition;
    return preferences?.menuPosition || "side";
  }, [isSmallScreen, menuPosition, preferences?.menuPosition]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: menuPositionEffective === "side" ? "column" : "row",
        alignItems: menuPositionEffective === "side" ? "stretch" : "center",
        bgcolor: "transparent",
        borderBottom: "none",
        borderRight:
          menuPositionEffective === "side" ? `1px solid ${theme.palette.divider}` : "none",
        p: 1,
      }}
    >
      {menuPositionEffective === "top" && renderGroupSelector()}
      <Box
        sx={{
          display: "flex",
          flexDirection: menuPositionEffective === "side" ? "column" : "row",
          flexGrow: 1,
          overflowX: menuPositionEffective === "top" ? "auto" : "visible",
          overflowY: menuPositionEffective === "side" ? "auto" : "visible",
        }}
      >
        {renderUrls()}
      </Box>
    </Box>
  );
}
