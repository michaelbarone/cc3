'use client';

import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
  useTheme
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import WebIcon from '@mui/icons-material/Web';
import FolderIcon from '@mui/icons-material/Folder';

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
  onUrlClick: (url: Url) => void;
  onLongPress?: (url: Url) => void;
}

export default function MenuBar({ urlGroups, activeUrlId, onUrlClick, onLongPress }: MenuBarProps) {
  const theme = useTheme();
  // Track open/close state of URL groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Handle long press for URL reset
  const handleMouseDown = (url: Url) => {
    if (!onLongPress) return;

    const timer = setTimeout(() => {
      onLongPress(url);
    }, 800); // 800ms long press

    // Clear the timeout if mouse is released
    const handleMouseUp = () => {
      clearTimeout(timer);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mouseup', handleMouseUp);
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
                {group.urls.map((url) => (
                  <ListItemButton
                    key={url.id}
                    sx={{
                      pl: 4,
                      borderLeft: activeUrlId === url.id ?
                        `4px solid ${theme.palette.primary.main}` :
                        'none',
                      bgcolor: activeUrlId === url.id ?
                        theme.palette.action.selected :
                        'inherit',
                    }}
                    onClick={() => onUrlClick(url)}
                    onMouseDown={() => handleMouseDown(url)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <WebIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={url.title}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: activeUrlId === url.id ? 'bold' : 'regular',
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
            <Divider sx={{ my: 1 }} />
          </Box>
        ))
      )}
    </List>
  );
}
