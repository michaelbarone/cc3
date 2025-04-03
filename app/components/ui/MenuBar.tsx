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
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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

// Memoize the MenuBar component
export const MenuBar = memo(function MenuBar({
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

  const handleGroupMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleGroupMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const getUrlStatus = useCallback(
    (urlId: string): string => {
      const isActive = urlId === activeUrlId;
      const isLoaded = loadedUrlIds.includes(urlId);
      return isActive
        ? isLoaded
          ? "active-loaded"
          : "active-unloaded"
        : isLoaded
          ? "inactive-loaded"
          : "inactive-unloaded";
    },
    [activeUrlId, loadedUrlIds],
  );

  const getTooltipText = useCallback((url: Url, status: string): string => {
    const statusText =
      status === "active-loaded"
        ? "Active"
        : status === "active-unloaded"
          ? "Loading..."
          : status === "inactive-loaded"
            ? "Loaded"
            : "Not Loaded";
    return `${url.title} (${statusText})`;
  }, []);

  const handleUrlLongPress = useCallback(
    (url: Url) => {
      setIsLongPressInProgress(true);
      onUrlReload(url);
      setTimeout(() => setIsLongPressInProgress(false), 1000);
    },
    [onUrlReload],
  );

  // Memoize the group selector render function
  const renderGroupSelector = useMemo(() => {
    const otherGroups = urlGroups.filter((group) => group.id !== selectedGroup?.id);
    const hasMultipleGroups = urlGroups.length > 1;

    return (
      <>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            color: "inherit",
            px: 1,
          }}
        >
          <ListItemIcon sx={{ minWidth: "auto", mr: 1 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          {hasMultipleGroups ? (
            <Button
              onClick={handleGroupMenuOpen}
              sx={{
                color: "inherit",
                textTransform: "none",
                minWidth: "auto",
                p: 0,
              }}
            >
              <ListItemText primary={selectedGroup?.name || "Select Group"} />
              <ArrowDropDownIcon />
            </Button>
          ) : (
            <Typography
              sx={{
                fontWeight: "medium",
              }}
            >
              {selectedGroup?.name || "Select Group"}
            </Typography>
          )}
        </Box>
        {hasMultipleGroups && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleGroupMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            PaperProps={{
              sx: {
                maxWidth: "90vw",
                maxHeight: "80vh",
              },
            }}
          >
            {otherGroups.map((group) => (
              <Box
                key={group.id}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:last-child": {
                    borderBottom: 0,
                  },
                }}
              >
                <MenuItem
                  sx={{
                    fontWeight: "bold",
                    minWidth: "fit-content",
                    borderRight: 1,
                    borderColor: "divider",
                    cursor: "default",
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: "auto", mr: 1 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={group.name} />
                </MenuItem>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    overflowX: "auto",
                    p: 1,
                    gap: 1,
                    "&::-webkit-scrollbar": {
                      height: 6,
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "primary.main",
                      borderRadius: 3,
                    },
                  }}
                >
                  {group.urls.map((urlInGroup) => {
                    const url = urlInGroup.url;
                    const status = getUrlStatus(url.id);
                    const isActive = status.startsWith("active");
                    const isLoaded = status.endsWith("loaded");

                    return (
                      <Button
                        key={url.id}
                        onClick={() => {
                          handleGroupSelect(group.id);
                          onUrlClick(url);
                          handleGroupMenuClose();
                        }}
                        sx={{
                          minWidth: "auto",
                          height: 40,
                          px: 2,
                          position: "relative",
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 1,
                          borderRadius: 1,
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                          "&::after": isLoaded
                            ? {
                                content: "''",
                                position: "absolute",
                                top: 4,
                                right: 4,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: "success.main",
                                opacity: 0.8,
                              }
                            : undefined,
                        }}
                      >
                        {url.iconPath ? (
                          <Image
                            src={url.iconPath}
                            alt={url.title}
                            width={20}
                            height={20}
                            style={{ maxWidth: "100%", height: "auto" }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActive ? "bold" : "normal",
                              color: "text.primary",
                              lineHeight: 1.2,
                            }}
                          >
                            {url.title}
                          </Typography>
                        )}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Menu>
        )}
      </>
    );
  }, [
    urlGroups,
    selectedGroup,
    anchorEl,
    handleGroupMenuOpen,
    handleGroupMenuClose,
    handleGroupSelect,
    onUrlClick,
  ]);

  // Memoize the URLs render function
  const renderedUrls = useMemo(() => {
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
  }, [
    selectedGroup,
    getUrlStatus,
    getTooltipText,
    onUrlClick,
    handleUrlLongPress,
    menuPosition,
    theme,
  ]);

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
      {menuPositionEffective === "top" && renderGroupSelector}
      <Box
        sx={{
          display: "flex",
          flexDirection: menuPositionEffective === "side" ? "column" : "row",
          flexGrow: 1,
          overflowX: menuPositionEffective === "top" ? "auto" : "visible",
          overflowY: menuPositionEffective === "side" ? "auto" : "visible",
        }}
      >
        {renderedUrls}
      </Box>
    </Box>
  );
});
