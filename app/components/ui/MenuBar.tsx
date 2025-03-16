'use client';

import { useState, useEffect } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
  useTheme,
  Badge,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import WebIcon from '@mui/icons-material/Web';
import FolderIcon from '@mui/icons-material/Folder';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

// Types for URLs and URL groups
interface Url {
  id: string;
  title: string;
  url: string;
  iconPath?: string;
  displayOrder: number;
}

interface UrlGroup {
  id: string;
  name: string;
  description?: string;
  urls: Url[];
}

interface MenuBarProps {
  urlGroups: UrlGroup[];
  activeUrlId: string | null;
  loadedUrlIds?: string[];
  onUrlClick: (url: Url) => void;
  onUrlReload?: (url: Url) => void;
  onUrlUnload?: (url: Url) => void;
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
  onUrlUnload
}: MenuBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Track open/close state of URL groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Track all known URL IDs (used to determine if a URL has been loaded before)
  const [knownUrlIds, setKnownUrlIds] = useState<Set<string>>(new Set());

  // Update known URL IDs when loadedUrlIds changes
  useEffect(() => {
    setKnownUrlIds(prev => {
      const newSet = new Set(prev);
      loadedUrlIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [loadedUrlIds]);

  // Automatically open groups that contain active URLs
  useEffect(() => {
    if (activeUrlId) {
      for (const group of urlGroups) {
        const hasActiveUrl = group.urls.some(url => url.id === activeUrlId);
        if (hasActiveUrl) {
          setOpenGroups(prev => ({
            ...prev,
            [group.id]: true
          }));
        }
      }
    }
  }, [activeUrlId, urlGroups]);

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
                  const isKnown = urlStatus !== 'new';

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
                          ) : isKnown && isUnloaded ? (
                            <Badge
                              color="error"
                              variant="dot"
                              overlap="circular"
                            >
                              <PowerSettingsNewIcon fontSize="small" />
                            </Badge>
                          ) : (
                            <WebIcon fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={url.title}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: isActive ? 'bold' : 'regular',
                          }}
                          secondary={isLoaded ? 'Loaded' : isUnloaded ? 'Unloaded' : ''}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            sx: {
                              fontSize: '0.7rem',
                              opacity: 0.6,
                              display: (isLoaded || isUnloaded) ? 'block' : 'none',
                              color: isUnloaded ? theme.palette.error.main : 'inherit'
                            }
                          }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Collapse>
            <Divider sx={{ my: 1 }} />
          </Box>
        ))
      )}
    </List>
  );
}
