"use client";

import { useLongPress } from "@/app/lib/hooks/useLongPress";
import { useIframeState } from "@/app/lib/state/iframe-state-context";
import { ExpandLess, ExpandMore, Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";
import { useCallback, useState } from "react";

interface UrlMenuProps {
  urlGroups: Array<{
    id: string;
    name: string;
    urls: Array<{
      id: string;
      title: string;
      url: string;
      urlMobile?: string | null;
      iconPath?: string | null;
      idleTimeoutMinutes?: number | null;
    }>;
  }>;
  activeUrlId?: string | null;
  onUrlSelect?: (urlId: string) => void;
}

export function UrlMenu({ urlGroups, activeUrlId: propActiveUrlId, onUrlSelect }: UrlMenuProps) {
  // State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(urlGroups.map((g) => g.id)),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const {
    activeUrlId: contextActiveUrlId,
    loadedUrlIds,
    reloadIframe,
    unloadIframe,
  } = useIframeState();

  // Use prop activeUrlId if provided, otherwise use context
  const activeUrlId = propActiveUrlId ?? contextActiveUrlId;

  // Handlers
  const handleGroupToggle = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleUrlClick = useCallback(
    (urlId: string) => {
      onUrlSelect?.(urlId);
    },
    [onUrlSelect],
  );

  const handleLongPress = useCallback(
    (urlId: string) => {
      if (loadedUrlIds.includes(urlId)) {
        unloadIframe(urlId);
      } else {
        reloadIframe(urlId);
      }
    },
    [loadedUrlIds, unloadIframe, reloadIframe],
  );

  // Filter URLs based on search query
  const filteredGroups = urlGroups
    .map((group) => ({
      ...group,
      urls: group.urls.filter(
        (url) =>
          url.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          url.url.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((group) => group.urls.length > 0);

  // Render URL item with proper state indicators
  const renderUrlItem = useCallback(
    (url: UrlMenuProps["urlGroups"][0]["urls"][0]) => {
      const isActive = url.id === activeUrlId;
      const isLoaded = loadedUrlIds.includes(url.id);
      const { onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd } = useLongPress({
        onClick: () => handleUrlClick(url.id),
        onLongPress: () => handleLongPress(url.id),
        duration: 500,
        disabled: false,
        visualFeedback: true,
      });

      return (
        <ListItem
          key={url.id}
          disablePadding
          data-url-id={url.id}
          sx={{
            position: "relative",
            "&::after": isLoaded
              ? {
                  content: '""',
                  position: "absolute",
                  top: "50%",
                  right: 8,
                  transform: "translateY(-50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "success.main",
                  opacity: 0.8,
                }
              : undefined,
          }}
        >
          <ListItemButton
            selected={isActive}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            sx={{
              pl: 4,
              borderLeft: isActive ? 2 : 0,
              borderColor: "primary.main",
            }}
          >
            <ListItemText
              primary={url.title}
              secondary={url.url}
              primaryTypographyProps={{
                fontWeight: isActive ? "bold" : "normal",
              }}
            />
          </ListItemButton>
        </ListItem>
      );
    },
    [activeUrlId, loadedUrlIds, handleLongPress, handleUrlClick],
  );

  // Render search field
  const renderSearch = () => (
    <Box sx={{ p: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search URLs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
        }}
      />
    </Box>
  );

  // Render empty state
  if (urlGroups.length === 0) {
    return <Box sx={{ p: 2, textAlign: "center" }}>No URLs available</Box>;
  }

  return (
    <Box>
      {renderSearch()}
      <List>
        {filteredGroups.map((group) => (
          <Box key={group.id}>
            <ListItemButton onClick={() => handleGroupToggle(group.id)}>
              <ListItemText primary={group.name} />
              {expandedGroups.has(group.id) ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={expandedGroups.has(group.id)} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.urls.map((url) => renderUrlItem(url))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Box>
  );
}
