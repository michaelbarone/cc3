'use client';

import { useState, useEffect, useRef } from 'react';
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
  Button
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Url, UrlGroup } from '@/app/lib/types';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';
import { Theme } from '@mui/material/styles';
import { useIframeState } from '@/app/lib/state/iframe-state-context';
import { LongPressProgress } from './LongPressProgress';

interface MenuBarProps {
  urlGroups: UrlGroup[];
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
  onUrlReload?: (url: Url) => void;
  onUrlUnload?: (url: Url) => void;
  menuPosition?: 'side' | 'top';
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
): 'active-loaded' | 'active-unloaded' | 'inactive-loaded' | 'inactive-unloaded' => {
  const isActive = urlId === activeUrlId;
  // Explicitly check if the URL is in the loadedUrlIds array
  const isLoaded = Array.isArray(loadedUrlIds) && loadedUrlIds.includes(urlId);

  // Log for debugging
  console.log(`URL ${urlId} status:`, {
    isActive,
    isLoaded,
    loadedUrlIds
  });

  if (isActive) {
    return isLoaded ? 'active-loaded' : 'active-unloaded';
  } else {
    return isLoaded ? 'inactive-loaded' : 'inactive-unloaded';
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
  theme
}: {
  url: Url;
  isActive: boolean;
  isLoaded: boolean;
  tooltipText: string;
  onUrlClick: (e: React.MouseEvent) => void;
  onMouseDown: () => void;
  onTouchStart: () => void;
  menuPosition: 'side' | 'top';
  theme: Theme;
}) {
  const { isLongPressing, longPressProgress, longPressUrlId } = useIframeState();
  const isLongPressingThis = isLongPressing && longPressUrlId === url.id;

  const commonIconStyles = {
    width: 24,
    height: 24,
    objectFit: 'contain' as const
  };

  const commonBadgeStyles = {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    '& .MuiBadge-badge': {
      backgroundColor: theme.palette.success.main,
      width: 8,
      height: 8,
      minWidth: 8,
      borderRadius: '50%',
      opacity: 0.8
    }
  };

  const commonBoxStyles = {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center'
  };

  if (menuPosition === 'top') {
    return (
      <Tooltip title={tooltipText}>
        <Button
          onClick={onUrlClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          data-url-id={url.id}
          sx={{
            mx: 0.5,
            textTransform: 'none',
            borderBottom: isActive ? `2px solid ${theme.palette.primary.main}` : 'none',
            borderRadius: 0,
            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
            fontWeight: isActive ? 'bold' : 'normal',
            backgroundColor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              opacity: 0.8,
            }
          }}
        >
          <Box sx={commonBoxStyles}>
            {url.iconPath ? (
              <Box
                component="img"
                src={url.iconPath}
                alt={url.title}
                sx={commonIconStyles}
              />
            ) : (
              url.title
            )}
            {isLoaded && (
              <Badge
                color="success"
                variant="dot"
                overlap="circular"
                sx={commonBadgeStyles}
              />
            )}
          </Box>
          <LongPressProgress
            isActive={isLongPressingThis}
            progress={longPressProgress}
          />
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipText} placement="right">
      <ListItemButton
        sx={{
          pl: 4,
          borderLeft: 'none',
          borderRight: isActive ?
            `4px solid ${theme.palette.primary.main}` :
            'none',
          bgcolor: 'inherit',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={onUrlClick}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        data-url-id={url.id}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Box sx={commonBoxStyles}>
            {url.iconPath ? (
              <Box
                component="img"
                src={url.iconPath}
                alt={url.title}
                sx={commonIconStyles}
              />
            ) : null}
            {isLoaded && (
              <Badge
                color="success"
                variant="dot"
                overlap="circular"
                sx={commonBadgeStyles}
              />
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={url.title}
          primaryTypographyProps={{
            color: isActive ? 'primary' : 'inherit',
            fontWeight: isActive ? 'bold' : 'normal'
          }}
        />
        <LongPressProgress
          isActive={isLongPressingThis}
          progress={longPressProgress}
        />
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
  menuPosition: propMenuPosition = 'side'
}: MenuBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const isInitialMount = useRef(true);

  // Track if this is the first render
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  // Track open/close state of URL groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // For top menu: track active group and group selector menu
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Track all known URL IDs (used to determine if a URL has been loaded before)
  const [knownUrlIds, setKnownUrlIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('iframe-state-known-url-ids');
    return new Set(stored ? JSON.parse(stored) : []);
  });

  // Add state to track if a long press is in progress
  const [isLongPressInProgress, setIsLongPressInProgress] = useState(false);

  // Mark initial render as complete after first render cycle
  useEffect(() => {
    setInitialRenderComplete(true);
  }, []);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    // Restore open groups state
    const storedOpenGroups = localStorage.getItem('menu-bar-open-groups');
    if (storedOpenGroups) {
      try {
        setOpenGroups(JSON.parse(storedOpenGroups));
      } catch (error) {
        console.error('Error restoring open groups state:', error);
      }
    }

    // If we have an active URL, ensure its group is open
    if (activeUrlId) {
      const activeGroup = urlGroups.find(group =>
        group.urls.some(url => url.id === activeUrlId)
      );
      if (activeGroup) {
        setOpenGroups(prev => ({
          ...prev,
          [activeGroup.id]: true
        }));
      }
    }
  }, [urlGroups, activeUrlId]);

  // Persist open groups state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('menu-bar-open-groups', JSON.stringify(openGroups));
  }, [openGroups]);

  // Persist known URL IDs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('iframe-state-known-url-ids', JSON.stringify(Array.from(knownUrlIds)));
  }, [knownUrlIds]);

  // Determine the final menu position with proper fallback
  // 1. For mobile devices, always use side menu regardless of preference
  // 2. If a valid prop is passed, use it (this preserves backward compatibility)
  // 3. If not, use the user preference
  // 4. If no valid preference, default to 'side'
  let menuPosition: 'side' | 'top' = 'side';

  // For mobile devices, always use side menu
  if (isMobile) {
    // On mobile devices, always use side menu layout regardless of user preference
    // This ensures consistent and optimized UI for smaller screens
    menuPosition = 'side';
  } else if (propMenuPosition === 'top' || propMenuPosition === 'side') {
    menuPosition = propMenuPosition;
  } else if (!preferencesLoading && preferences.menuPosition) {
    menuPosition = preferences.menuPosition;
  }

  // Log for debugging
  console.log('MenuBar menuPosition:', {
    propMenuPosition,
    preferenceMenuPosition: preferences.menuPosition,
    isMobile,
    finalMenuPosition: menuPosition,
    preferencesLoading
  });

  // For debugging: log when activeGroupId changes
  useEffect(() => {
    console.log('MenuBar activeGroupId updated:', {
      activeGroupId,
      menuPosition,
      activeUrlId,
      activeUrlInThisGroup: activeGroupId
        ? urlGroups.find(g => g.id === activeGroupId)?.urls.some(u => u.id === activeUrlId)
        : false
    });
  }, [activeGroupId, menuPosition, activeUrlId, urlGroups]);

  // Update known URL IDs when loadedUrlIds changes
  useEffect(() => {
    setKnownUrlIds(prev => {
      const newSet = new Set(prev);
      loadedUrlIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [loadedUrlIds]);

  // Automatically open groups that contain active URLs and update active group for top menu
  useEffect(() => {
    if (activeUrlId) {
      // Find the group containing the active URL
      const activeUrlGroup = urlGroups.find(group =>
        group.urls.some(url => url.id === activeUrlId)
      );

      // If found, update the active group for top menu
      if (activeUrlGroup) {
        // For top menu: always set the active group to the one containing the active URL
        if (menuPosition === 'top') {
          setActiveGroupId(activeUrlGroup.id);
        }

        // Open the group in the side menu view
        setOpenGroups(prev => ({
          ...prev,
          [activeUrlGroup.id]: true
        }));
      }
    }
  }, [activeUrlId, urlGroups, menuPosition]);

  // On mobile, automatically collapse non-active groups
  useEffect(() => {
    if (isMobile && activeUrlId) {
      const updatedGroups: Record<string, boolean> = {};

      for (const group of urlGroups) {
        const hasActiveUrl = group.urls.some(url => url.id === activeUrlId);
        updatedGroups[group.id] = hasActiveUrl;
      }

      setOpenGroups(updatedGroups);
    }
  }, [isMobile, activeUrlId, urlGroups]);

  // Set initial active group only if no active URL is found
  useEffect(() => {
    // Only set initial active group if:
    // 1. We're using the top menu
    // 2. We have URL groups
    // 3. We don't have an active URL ID (which would have set the group in the previous effect)
    // 4. We don't already have an active group ID
    if (menuPosition === 'top' && urlGroups.length > 0 && !activeUrlId && !activeGroupId) {
      setActiveGroupId(urlGroups[0].id);
    }
  }, [urlGroups, activeGroupId, menuPosition, activeUrlId]);

  // Only show a placeholder during initial load when preferences are loading and a prop wasn't passed
  const isLoading = !initialRenderComplete || (preferencesLoading && propMenuPosition !== 'top' && propMenuPosition !== 'side');

  // If still loading preferences and no explicit menuPosition prop was passed, show minimal placeholder
  if (isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: propMenuPosition === 'top' ? 'auto' : '100%',
        width: '100%'
      }}>
        <Typography variant="body2" color="text.secondary">
          Loading menu...
        </Typography>
      </Box>
    );
  }

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Handle URL click:
  // - If not active, make it active (regardless of loaded state)
  // - If already active, reload it
  const handleUrlClick = (url: Url) => {
    // Skip if a long press operation just completed
    if (isLongPressInProgress) {
      return;
    }

    if (activeUrlId === url.id) {
      // If already active, reload it
      if (onUrlReload) onUrlReload(url);
    } else {
      // If not active, make it active (this will trigger reload if unloaded)
      onUrlClick(url);

      // For top menu: immediately find and set the active group containing this URL
      if (menuPosition === 'top') {
        const groupContainingUrl = urlGroups.find(group =>
          group.urls.some(groupUrl => groupUrl.id === url.id)
        );

        if (groupContainingUrl) {
          setActiveGroupId(groupContainingUrl.id);
        }
      }
    }
  };

  // Handle long press for URL unload
  const handleUrlLongPress = (url: Url) => {
    if (!onUrlUnload) return;

    // Set long press flag to prevent navigation
    setIsLongPressInProgress(true);

    // Only handle long press for loaded URLs (regardless of active state)
    if (loadedUrlIds.includes(url.id)) {
      onUrlUnload(url);
    }

    // Reset the flag after a delay to ensure click event doesn't fire
    setTimeout(() => {
      setIsLongPressInProgress(false);
    }, 500);
  };

  // Handle mouse down for long press detection
  const handleMouseDown = (url: Url) => {
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
        document.removeEventListener('mouseup', handleMouseUp);

        // If this was a long press, prevent the click event
        if (longPressTriggered) {
          e.preventDefault();
          e.stopPropagation();

          // Also listen for click events to prevent them
          const preventClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener('click', preventClick, true);
          };

          // Capture the next click event and prevent it
          document.addEventListener('click', preventClick, true);
        }
      };

      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Handle touch events for mobile devices
  const handleTouchStart = (url: Url) => {
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
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);

        // If this was a long press, prevent the subsequent click event
        if (longPressTriggered) {
          e.preventDefault();

          // Also listen for click events to prevent them
          const preventClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener('click', preventClick, true);
          };

          // Capture the next click event and prevent it
          document.addEventListener('click', preventClick, true);
        }
      };

      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }
  };

  // Wrap handleUrlClick with a check for long press
  const safeHandleUrlClick = (url: Url, extraAction?: () => void) => {
    if (isLongPressInProgress) {
      console.log('Click prevented due to long press');
      return;
    }

    handleUrlClick(url);
    if (extraAction) extraAction();
  };

  // For top menu: handle group menu open
  const handleGroupMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setGroupMenuAnchorEl(event.currentTarget);
  };

  // For top menu: handle group menu close
  const handleGroupMenuClose = () => {
    setGroupMenuAnchorEl(null);
  };

  // For top menu: handle group selection
  const handleGroupSelect = (groupId: string) => {
    setActiveGroupId(groupId);
    handleGroupMenuClose();
  };

  // In the render section for both top and side menu, replace the URL rendering with:
  const renderUrlItem = (url: Url) => {
    const urlStatus = getUrlStatus(url.id, activeUrlId, loadedUrlIds);
    const isActive = urlStatus.startsWith('active');
    const isLoaded = urlStatus === 'active-loaded' || urlStatus === 'inactive-loaded';

    // Determine tooltip text based on status
    let tooltipText = '';
    if (isActive && isLoaded) tooltipText = 'Currently active (click to reload, long press to unload)';
    else if (isActive && !isLoaded) tooltipText = 'Currently active but unloaded (click to reload)';
    else if (!isActive && isLoaded) tooltipText = 'Loaded in background (click to view, long press to unload)';
    else tooltipText = 'Currently unloaded (click to load and view)';

    return (
      <UrlItem
        key={url.id}
        url={url}
        isActive={isActive}
        isLoaded={isLoaded}
        tooltipText={tooltipText}
        onUrlClick={(e) => {
          e.stopPropagation();
          safeHandleUrlClick(url);
        }}
        onMouseDown={() => handleMouseDown(url)}
        onTouchStart={() => handleTouchStart(url)}
        menuPosition={menuPosition}
        theme={theme}
      />
    );
  };

  // Render top menu layout
  if (menuPosition === 'top') {
    // Find group containing active URL first (prioritize it)
    const activeUrlGroup = activeUrlId
      ? urlGroups.find(group => group.urls.some(url => url.id === activeUrlId))
      : null;

    // Use the group containing the active URL, or fall back to activeGroupId selection
    const activeGroup = activeUrlGroup || urlGroups.find(group => group.id === activeGroupId);

    // Log for debugging which group we're selecting
    if (activeGroup) {
      console.log('Top menu displaying group:', {
        groupId: activeGroup.id,
        groupName: activeGroup.name,
        containsActiveUrl: activeUrlId ? activeGroup.urls.some(url => url.id === activeUrlId) : false,
        activeUrlId
      });
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
        {/* Group selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Button
            onClick={handleGroupMenuOpen}
            endIcon={<ArrowDropDownIcon />}
            sx={{ textTransform: 'none' }}
          >
            <FolderIcon sx={{ mr: 1 }} />
            {activeGroup?.name || 'Select Group'}
          </Button>
          <Menu
            anchorEl={groupMenuAnchorEl}
            open={Boolean(groupMenuAnchorEl)}
            onClose={handleGroupMenuClose}
            PaperProps={{
              sx: {
                maxWidth: '80vw',
                maxHeight: '60vh',
                overflowX: 'hidden'
              }
            }}
          >
            {urlGroups
              .filter(group => group.id !== activeGroupId) // Filter out the currently selected group
              .map(group => (
                <Box key={group.id} sx={{ p: 1 }}>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <MenuItem
                      onClick={() => handleGroupSelect(group.id)}
                      sx={{
                        fontWeight: 'bold',
                        pl: 1,
                        pr: 2,
                        mr: 1,
                        borderRight: `1px solid ${theme.palette.divider}`
                      }}
                    >
                      <FolderIcon sx={{ mr: 1 }} />
                      {group.name}
                    </MenuItem>

                    {group.urls.map(url => renderUrlItem(url))}
                  </Box>

                  {group.id !== urlGroups.filter(g => g.id !== activeGroupId).slice(-1)[0].id && (
                    <Box sx={{ my: 1, borderBottom: `1px solid ${theme.palette.divider}` }} />
                  )}
                </Box>
              ))}
          </Menu>
        </Box>

        {/* URLs in active group */}
        <Box sx={{
          display: 'flex',
          flexGrow: 1,
          overflow: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {activeGroup?.urls.map(url => renderUrlItem(url))}
        </Box>
      </Box>
    );
  }

  // Default side menu layout
  return (
    <List
      sx={{
        width: '100%',
        bgcolor: 'background.default',
        p: 1,
        height: '100%',
        overflow: 'auto'
      }}
      component="nav"
    >
      {urlGroups.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No URL groups available
          </Typography>
        </Box>
      ) : (
        urlGroups.map((group) => (
          <Box key={group.id}>
            <ListItemButton onClick={() => toggleGroup(group.id)}>
              <ListItemIcon>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary={group.name}
                primaryTypographyProps={{
                  fontWeight: 'medium',
                  component: 'div'
                }}
              />
              {openGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openGroups[group.id] ?? false} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.urls.map(url => renderUrlItem(url))}
              </List>
            </Collapse>
          </Box>
        ))
      )}
    </List>
  );
}
