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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstGroupHeaderRef = useRef<HTMLDivElement>(null);
  const {
    activeUrlId: contextActiveUrlId,
    loadedUrlIds,
    reloadIframe,
    unloadIframe,
  } = useIframeState();

  // Use prop activeUrlId if provided, otherwise use context
  const activeUrlId = propActiveUrlId ?? contextActiveUrlId;

  // Filter URLs based on search query
  const filteredGroups = useMemo(
    () =>
      urlGroups
        .map((group) => ({
          ...group,
          urls: group.urls.filter(
            (url) =>
              url.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              url.url.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((group) => group.urls.length > 0),
    [urlGroups, searchQuery],
  );

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

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.blur();
        firstGroupHeaderRef.current?.focus();
      } else if (e.key === "Enter" && document.activeElement?.hasAttribute("data-group-id")) {
        const groupId = document.activeElement.getAttribute("data-group-id");
        if (groupId) {
          handleGroupToggle(groupId);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleGroupToggle]);

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

  // Render URL item with proper state indicators
  const renderUrlItem = useCallback(
    (url: UrlMenuProps["urlGroups"][0]["urls"][0]) => {
      const isActive = url.id === activeUrlId;
      const isLoaded = loadedUrlIds.includes(url.id);

      return (
        <UrlMenuItem
          key={url.id}
          url={url}
          isActive={isActive}
          isLoaded={isLoaded}
          onUrlClick={handleUrlClick}
          onLongPress={handleLongPress}
        />
      );
    },
    [activeUrlId, loadedUrlIds, handleLongPress, handleUrlClick],
  );

  // Add UrlMenuItem component
  const UrlMenuItem = ({
    url,
    isActive,
    isLoaded,
    onUrlClick,
    onLongPress,
  }: {
    url: UrlMenuProps["urlGroups"][0]["urls"][0];
    isActive: boolean;
    isLoaded: boolean;
    onUrlClick: (urlId: string) => void;
    onLongPress: (urlId: string) => void;
  }) => {
    const { onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd } = useLongPress({
      onClick: () => onUrlClick(url.id),
      onLongPress: () => onLongPress(url.id),
      duration: 500,
      disabled: false,
      visualFeedback: true,
    });

    return (
      <ListItem
        disablePadding
        data-url-id={url.id}
        sx={{
          position: "relative",
          "--loaded-indicator": isLoaded ? "''" : "none",
          "&::after": isLoaded
            ? {
                content: "var(--loaded-indicator)",
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
          data-url-id={url.id}
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
  };

  // Render search field
  const renderSearch = () => (
    <Box sx={{ mb: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search URLs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        inputRef={searchInputRef}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
        }}
      />
    </Box>
  );

  // Render group header
  const renderGroupHeader = useCallback(
    (group: UrlMenuProps["urlGroups"][0], index: number) => (
      <ListItemButton
        ref={index === 0 ? firstGroupHeaderRef : undefined}
        onClick={() => handleGroupToggle(group.id)}
        data-group-id={group.id}
      >
        <ListItemText primary={group.name} />
        {expandedGroups.has(group.id) ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
    ),
    [expandedGroups, handleGroupToggle],
  );

  // Render empty state
  if (urlGroups.length === 0) {
    return <Box sx={{ p: 2, textAlign: "center" }}>No URLs available</Box>;
  }

  return (
    <Box>
      {renderSearch()}
      <List>
        {filteredGroups.map((group, index) => (
          <Box key={group.id}>
            {renderGroupHeader(group, index)}
            <Collapse in={expandedGroups.has(group.id)} timeout="auto">
              <List role="list" aria-label={`${group.name} URLs`} sx={{ pl: 2 }}>
                {group.urls.map(renderUrlItem)}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Box>
  );
}
