'use client';

import { useState, useEffect } from 'react';
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
import WebIcon from '@mui/icons-material/Web';
import FolderIcon from '@mui/icons-material/Folder';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Url, UrlGroup } from '@/app/lib/types';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';

interface MenuBarProps {
  urlGroups: UrlGroup[];
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
  onUrlReload?: (url: Url) => void;
  onUrlUnload?: (url: Url) => void;
  menuPosition?: 'side' | 'top';
}

// Helper to determine if a URL is loaded, unloaded, or inactive
const getUrlStatus = (
  urlId: string,
  activeUrlId: string | null,
  loadedUrlIds: string[],
  knownUrlIds: Set<string>
): 'active-loaded' | 'active-unloaded' | 'inactive-loaded' | 'inactive-unloaded' | 'new' => {
  const isActive = urlId === activeUrlId;
  const isLoaded = loadedUrlIds.includes(urlId);
  const isKnown = knownUrlIds.has(urlId);

  if (!isKnown) return 'new';

  if (isActive) {
    return isLoaded ? 'active-loaded' : 'active-unloaded';
  } else {
    return isLoaded ? 'inactive-loaded' : 'inactive-unloaded';
  }
};

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

  // Track if this is the first render
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  // Track open/close state of URL groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // For top menu: track active group and group selector menu
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Track all known URL IDs (used to determine if a URL has been loaded before)
  const [knownUrlIds, setKnownUrlIds] = useState<Set<string>>(new Set());

  // Mark initial render as complete after first render cycle
  useEffect(() => {
    setInitialRenderComplete(true);
  }, []);

  // Determine the final menu position with proper fallback
  // 1. If a valid prop is passed, use it (this preserves backward compatibility)
  // 2. If not, use the user preference
  // 3. If no valid preference, default to 'side'
  let menuPosition: 'side' | 'top' = 'side';

  if (propMenuPosition === 'top' || propMenuPosition === 'side') {
    menuPosition = propMenuPosition;
  } else if (!preferencesLoading && preferences.menuPosition) {
    menuPosition = preferences.menuPosition;
  }

  // Log for debugging
  console.log('MenuBar menuPosition:', {
    propMenuPosition,
    preferenceMenuPosition: preferences.menuPosition,
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

    // Only allow unloading if the URL is loaded
    if (loadedUrlIds.includes(url.id)) {
      onUrlUnload(url);
    }
  };

  // Handle mouse down for long press detection
  const handleMouseDown = (url: Url) => {
    if (!onUrlUnload) return;

    const timer = setTimeout(() => {
      handleUrlLongPress(url);
    }, 800); // 800ms long press

    // Clear the timeout if mouse is released
    const handleMouseUp = () => {
      clearTimeout(timer);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle touch events for mobile devices
  const handleTouchStart = (url: Url) => {
    if (!onUrlUnload) return;

    const timer = setTimeout(() => {
      handleUrlLongPress(url);
    }, 800);

    // Function to clear the timeout on touch end
    const handleTouchEnd = () => {
      clearTimeout(timer);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
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
          >
            {urlGroups.map(group => (
              <MenuItem
                key={group.id}
                onClick={() => handleGroupSelect(group.id)}
                selected={group.id === activeGroupId}
              >
                {group.name}
              </MenuItem>
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
          {activeGroup?.urls.map(url => {
            const urlStatus = getUrlStatus(url.id, activeUrlId, loadedUrlIds, knownUrlIds);
            const isActive = urlStatus.startsWith('active');
            const isLoaded = urlStatus.includes('loaded');
            const isUnloaded = urlStatus.includes('unloaded');

            // Determine tooltip text based on status
            let tooltipText = '';
            if (isActive && isLoaded) tooltipText = 'Currently active (click to reload)';
            else if (isActive && isUnloaded) tooltipText = 'Currently active but unloaded (click to reload)';
            else if (isLoaded) tooltipText = 'Loaded in background (click to view)';
            else if (isUnloaded) tooltipText = 'Currently unloaded (click to reload)';
            else tooltipText = 'Click to view';

            return (
              <Tooltip key={url.id} title={tooltipText}>
                <Button
                  onClick={() => handleUrlClick(url)}
                  onMouseDown={() => handleMouseDown(url)}
                  onTouchStart={() => handleTouchStart(url)}
                  sx={{
                    mx: 0.5,
                    textTransform: 'none',
                    borderBottom: isActive ? `2px solid ${theme.palette.primary.main}` : 'none',
                    borderRadius: 0,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                    fontWeight: isActive ? 'bold' : 'normal',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      opacity: 0.8,
                    }
                  }}
                >
                  {isLoaded && !isActive ? (
                    <Badge
                      color="success"
                      variant="dot"
                      overlap="circular"
                      sx={{ mr: 1 }}
                    >
                      <WebIcon fontSize="small" />
                    </Badge>
                  ) : (
                    <WebIcon fontSize="small" sx={{ mr: 1 }} />
                  )}
                  {url.title}
                </Button>
              </Tooltip>
            );
          })}
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
                secondary={group.description}
                primaryTypographyProps={{
                  fontWeight: 'medium',
                }}
              />
              {openGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openGroups[group.id] ?? false} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.urls.map((url) => {
                  const urlStatus = getUrlStatus(url.id, activeUrlId, loadedUrlIds, knownUrlIds);
                  const isActive = urlStatus.startsWith('active');
                  const isLoaded = urlStatus.includes('loaded');
                  const isUnloaded = urlStatus.includes('unloaded');

                  // Determine tooltip text based on status
                  let tooltipText = '';
                  if (isActive && isLoaded) tooltipText = 'Currently active (click to reload)';
                  else if (isActive && isUnloaded) tooltipText = 'Currently active but unloaded (click to reload)';
                  else if (isLoaded) tooltipText = 'Loaded in background (click to view)';
                  else if (isUnloaded) tooltipText = 'Currently unloaded (click to reload)';
                  else tooltipText = 'Click to view';

                  return (
                    <Tooltip title={tooltipText} key={url.id} placement="right">
                      <ListItemButton
                        sx={{
                          pl: 4,
                          borderLeft: isActive ?
                            `4px solid ${theme.palette.primary.main}` :
                            'none',
                          bgcolor: isActive ?
                            theme.palette.action.selected :
                            'inherit',
                          position: 'relative',
                        }}
                        onClick={() => handleUrlClick(url)}
                        onMouseDown={() => handleMouseDown(url)}
                        onTouchStart={() => handleTouchStart(url)}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isLoaded && !isActive ? (
                            <Badge
                              color="success"
                              variant="dot"
                              overlap="circular"
                            >
                              <WebIcon fontSize="small" />
                            </Badge>
                          ) : (
                            <WebIcon fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={url.title}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: isActive ? 'bold' : 'normal',
                          }}
                        />
                        {isActive && isUnloaded && (
                          <PowerSettingsNewIcon
                            color="error"
                            fontSize="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        ))
      )}
    </List>
  );
}
