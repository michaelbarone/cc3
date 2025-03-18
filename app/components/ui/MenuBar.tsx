"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  useTheme,
  Badge,
  useMediaQuery,
  Tooltip,
  Menu,
  MenuItem,
  Button,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Url, UrlGroup } from "@/app/lib/types";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { Theme } from "@mui/material/styles";
import { useIframeState } from "@/app/lib/state/iframe-state-context";
import { LongPressProgress } from "./LongPressProgress";

interface MenuBarProps {
  urlGroups: UrlGroup[];
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
  onUrlReload?: (url: Url) => void;
  onUrlUnload?: (url: Url) => void;
  menuPosition?: "side" | "top";
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

// Common URL item component that works for both side and top menu layouts
function UrlItem({
  url,
  isActive,
  isLoaded,
  tooltipText,
  onUrlClick,
  onMouseDown,
  onTouchStart,
  menuPosition,
  theme,
}: {
  url: Url;
  isActive: boolean;
  isLoaded: boolean;
  tooltipText: string;
  onUrlClick: (e: React.MouseEvent) => void;
  onMouseDown: () => void;
  onTouchStart: () => void;
  menuPosition: "side" | "top";
  theme: Theme;
}) {
  const { isLongPressing, longPressProgress, longPressUrlId } = useIframeState();
  const isLongPressingThis = isLongPressing && longPressUrlId === url.id;

  const commonIconStyles = {
    width: 24,
    height: 24,
    objectFit: "contain" as const,
  };

  const commonBadgeStyles = {
    position: "absolute" as const,
    top: -2,
    right: -2,
    "& .MuiBadge-badge": {
      backgroundColor: theme.palette.success.main,
      width: 8,
      height: 8,
      minWidth: 8,
      borderRadius: "50%",
      opacity: 0.8,
    },
  };

  const commonBoxStyles = {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  };

  if (menuPosition === "top") {
    return (
      <Tooltip title={tooltipText}>
        <Button
          onClick={onUrlClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          data-url-id={url.id}
          sx={{
            mx: 0.5,
            textTransform: "none",
            borderBottom: isActive ? `2px solid ${theme.palette.primary.main}` : "none",
            borderRadius: 0,
            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
            fontWeight: isActive ? "bold" : "normal",
            backgroundColor: "transparent",
            position: "relative",
            overflow: "hidden",
            "&:hover": {
              opacity: 0.8,
            },
          }}
        >
          <Box sx={commonBoxStyles}>
            {url.iconPath ? (
              <Box component="img" src={url.iconPath} alt={url.title} sx={commonIconStyles} />
            ) : (
              url.title
            )}
            {isLoaded && (
              <Badge color="success" variant="dot" overlap="circular" sx={commonBadgeStyles} />
            )}
          </Box>
          <LongPressProgress isActive={isLongPressingThis} progress={longPressProgress} />
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipText} placement="right">
      <ListItemButton
        sx={{
          pl: 4,
          borderLeft: "none",
          borderRight: isActive ? `4px solid ${theme.palette.primary.main}` : "none",
          bgcolor: "inherit",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={onUrlClick}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        data-url-id={url.id}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Box sx={commonBoxStyles}>
            {url.iconPath ? (
              <Box component="img" src={url.iconPath} alt={url.title} sx={commonIconStyles} />
            ) : null}
            {isLoaded && (
              <Badge color="success" variant="dot" overlap="circular" sx={commonBadgeStyles} />
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={url.title}
          primaryTypographyProps={{
            color: isActive ? "primary" : "inherit",
            fontWeight: isActive ? "bold" : "normal",
          }}
        />
        <LongPressProgress isActive={isLongPressingThis} progress={longPressProgress} />
      </ListItemButton>
    </Tooltip>
  );
}

export default function MenuBar({
  urlGroups,
  activeUrlId,
  loadedUrlIds = [],
  onUrlClick,
  onUrlReload,
  onUrlUnload,
  menuPosition: propMenuPosition = "side",
}: MenuBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const previousActiveUrlId = useRef<string | null>(null);
  const [isLongPressInProgress, setIsLongPressInProgress] = useState(false);

  // Determine effective menu position
  const menuPosition = useMemo(() => {
    if (isMobile) return "side";
    if (propMenuPosition === "top" || propMenuPosition === "side") return propMenuPosition;
    return preferences?.menuPosition || "side";
  }, [isMobile, propMenuPosition, preferences?.menuPosition]);

  // Handle active URL group management
  useEffect(() => {
    if (activeUrlId && activeUrlId !== previousActiveUrlId.current) {
      previousActiveUrlId.current = activeUrlId;
      const activeGroup = urlGroups.find((group) =>
        group.urls.some((url) => url.id === activeUrlId),
      );

      if (activeGroup) {
        if (menuPosition === "side") {
          setOpenGroups((prev) => ({
            ...prev,
            [activeGroup.id]: true,
          }));
        } else {
          setActiveGroupId(activeGroup.id);
        }
      }
    }
  }, [activeUrlId, urlGroups, menuPosition]);

  // Handle group toggle
  const handleGroupToggle = useCallback(
    (groupId: string) => {
      if (menuPosition === "side") {
        setOpenGroups((prev) => ({
          ...prev,
          [groupId]: !prev[groupId],
        }));
      } else {
        setActiveGroupId((prev) => (prev === groupId ? null : groupId));
      }
    },
    [menuPosition],
  );

  // Handle group menu
  const handleGroupMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, groupId: string) => {
      event.stopPropagation();
      setGroupMenuAnchorEl(event.currentTarget);
      setActiveGroupId(groupId);
    },
    [],
  );

  const handleGroupMenuClose = useCallback(() => {
    setGroupMenuAnchorEl(null);
  }, []);

  // Memoize URL click handler
  const handleUrlClick = useCallback(
    (url: Url) => {
      if (isLongPressInProgress) {
        return;
      }

      if (activeUrlId === url.id) {
        if (onUrlReload) onUrlReload(url);
      } else {
        onUrlClick(url);

        if (menuPosition === "top") {
          const groupContainingUrl = urlGroups.find((group) =>
            group.urls.some((groupUrl) => groupUrl.id === url.id),
          );
          if (groupContainingUrl) {
            setActiveGroupId(groupContainingUrl.id);
          }
        }
      }
    },
    [activeUrlId, isLongPressInProgress, menuPosition, onUrlClick, onUrlReload, urlGroups],
  );

  // Memoize long press handler
  const handleUrlLongPress = useCallback(
    (url: Url) => {
      if (!onUrlUnload) return;

      setIsLongPressInProgress(true);

      if (loadedUrlIds.includes(url.id)) {
        onUrlUnload(url);
      }

      setTimeout(() => {
        setIsLongPressInProgress(false);
      }, 500);
    },
    [loadedUrlIds, onUrlUnload],
  );

  // Handle mouse down for long press detection
  const handleMouseDown = useCallback(
    (url: Url) => {
      if (!onUrlUnload) return;

      // Only setup long press for loaded items
      if (loadedUrlIds.includes(url.id)) {
        let longPressTriggered = false;

        const timer = setTimeout(() => {
          longPressTriggered = true;
          handleUrlLongPress(url);
        }, 800); // 800ms long press

        // Clear the timeout if mouse is released
        const handleMouseUp = (e: MouseEvent) => {
          clearTimeout(timer);
          document.removeEventListener("mouseup", handleMouseUp);

          // If this was a long press, prevent the click event
          if (longPressTriggered) {
            e.preventDefault();
            e.stopPropagation();

            // Also listen for click events to prevent them
            const preventClick = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              document.removeEventListener("click", preventClick, true);
            };

            // Capture the next click event and prevent it
            document.addEventListener("click", preventClick, true);
          }
        };

        document.addEventListener("mouseup", handleMouseUp);
      }
    },
    [loadedUrlIds, onUrlUnload, handleUrlLongPress],
  );

  // Handle touch events for mobile devices
  const handleTouchStart = useCallback(
    (url: Url) => {
      if (!onUrlUnload) return;

      // Only setup long press for loaded items
      if (loadedUrlIds.includes(url.id)) {
        let longPressTriggered = false;

        const timer = setTimeout(() => {
          longPressTriggered = true;
          handleUrlLongPress(url);
        }, 800);

        // Function to clear the timeout on touch end
        const handleTouchEnd = (e: TouchEvent) => {
          clearTimeout(timer);
          document.removeEventListener("touchend", handleTouchEnd);
          document.removeEventListener("touchcancel", handleTouchEnd);

          // If this was a long press, prevent the subsequent click event
          if (longPressTriggered) {
            e.preventDefault();

            // Also listen for click events to prevent them
            const preventClick = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              document.removeEventListener("click", preventClick, true);
            };

            // Capture the next click event and prevent it
            document.addEventListener("click", preventClick, true);
          }
        };

        document.addEventListener("touchend", handleTouchEnd);
        document.addEventListener("touchcancel", handleTouchEnd);
      }
    },
    [loadedUrlIds, onUrlUnload, handleUrlLongPress],
  );

  // Memoize URL item renderer
  const renderUrlItem = useCallback(
    (url: Url) => {
      const urlStatus = getUrlStatus(url.id, activeUrlId, loadedUrlIds);
      const isActive = urlStatus.startsWith("active");
      const isLoaded = urlStatus === "active-loaded" || urlStatus === "inactive-loaded";

      let tooltipText = "";
      if (isActive && isLoaded)
        tooltipText = "Currently active (click to reload, long press to unload)";
      else if (isActive && !isLoaded)
        tooltipText = "Currently active but unloaded (click to reload)";
      else if (!isActive && isLoaded)
        tooltipText = "Loaded in background (click to view, long press to unload)";
      else tooltipText = "Currently unloaded (click to load and view)";

      return (
        <UrlItem
          key={url.id}
          url={url}
          isActive={isActive}
          isLoaded={isLoaded}
          tooltipText={tooltipText}
          onUrlClick={(e) => {
            e.stopPropagation();
            handleUrlClick(url);
          }}
          onMouseDown={() => handleMouseDown(url)}
          onTouchStart={() => handleTouchStart(url)}
          menuPosition={menuPosition}
          theme={theme}
        />
      );
    },
    [
      activeUrlId,
      loadedUrlIds,
      menuPosition,
      theme,
      handleUrlClick,
      handleMouseDown,
      handleTouchStart,
    ],
  );

  // Loading state check
  if (preferencesLoading && propMenuPosition !== "top" && propMenuPosition !== "side") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: propMenuPosition === "top" ? "auto" : "100%",
          width: "100%",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Loading menu...
        </Typography>
      </Box>
    );
  }

  // Render top menu layout
  if (menuPosition === "top") {
    // Find group containing active URL first (prioritize it)
    const activeUrlGroup = activeUrlId
      ? urlGroups.find((group) => group.urls.some((url) => url.id === activeUrlId))
      : null;

    // Use the group containing the active URL, or fall back to activeGroupId selection
    const activeGroup = activeUrlGroup || urlGroups.find((group) => group.id === activeGroupId);

    return (
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", width: "100%" }}>
        {/* Group selector */}
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          <Button
            onClick={(event) => handleGroupMenuOpen(event, activeGroup?.id || "")}
            endIcon={<ArrowDropDownIcon />}
            sx={{ textTransform: "none" }}
          >
            <FolderIcon sx={{ mr: 1 }} />
            {activeGroup?.name || "Select Group"}
          </Button>
          <Menu
            anchorEl={groupMenuAnchorEl}
            open={Boolean(groupMenuAnchorEl)}
            onClose={handleGroupMenuClose}
            PaperProps={{
              sx: {
                maxWidth: "80vw",
                maxHeight: "60vh",
                overflowX: "hidden",
              },
            }}
          >
            {urlGroups
              .filter((group) => group.id !== activeGroup?.id) // Filter out the currently selected group
              .map((group) => (
                <Box key={group.id} sx={{ p: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <MenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        handleGroupToggle(group.id);
                      }}
                      sx={{
                        fontWeight: "bold",
                        pl: 1,
                        pr: 2,
                        mr: 1,
                        borderRight: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <FolderIcon sx={{ mr: 1 }} />
                      {group.name}
                    </MenuItem>

                    {group.urls.map((url) => renderUrlItem(url))}
                  </Box>

                  {group.id !==
                    urlGroups.filter((g) => g.id !== activeGroup?.id).slice(-1)[0].id && (
                    <Box sx={{ my: 1, borderBottom: `1px solid ${theme.palette.divider}` }} />
                  )}
                </Box>
              ))}
          </Menu>
        </Box>

        {/* URLs in active group */}
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            overflow: "auto",
            whiteSpace: "nowrap",
            alignItems: "center",
            px: 2,
            gap: 1,
          }}
        >
          {activeGroup?.urls.map((url) => renderUrlItem(url))}
        </Box>
      </Box>
    );
  }

  // Default side menu layout
  return (
    <List
      sx={{
        width: "100%",
        bgcolor: "background.default",
        p: 1,
        height: "100%",
        overflow: "auto",
      }}
      component="nav"
    >
      {urlGroups.length === 0 ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No URL groups available
          </Typography>
        </Box>
      ) : (
        urlGroups.map((group) => (
          <Box key={group.id}>
            <ListItemButton onClick={() => handleGroupToggle(group.id)}>
              <ListItemIcon>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary={group.name}
                primaryTypographyProps={{
                  fontWeight: "medium",
                  component: "div",
                }}
              />
              {openGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openGroups[group.id] ?? false} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.urls.map((url) => renderUrlItem(url))}
              </List>
            </Collapse>
          </Box>
        ))
      )}
    </List>
  );
}
