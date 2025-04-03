"use client";

import { useUrlManager } from "@/app/lib/hooks/useIframe";
import { useLongPress } from "@/app/lib/hooks/useLongPress";
import type { UrlGroup } from "@/app/types/iframe";
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
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

interface UrlMenuProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
}

// Extract UrlMenuItem to a separate memoized component
const UrlMenuItem = memo(
  ({
    url,
    isActive,
    isLoaded,
    onUrlClick,
    onLongPress,
  }: {
    url: UrlGroup["urls"][0] & { title: string };
    isActive: boolean;
    isLoaded: boolean;
    onUrlClick: (urlId: string) => void;
    onLongPress: (urlId: string) => void;
  }) => {
    // Memoize the long press handlers
    const longPressHandlers = useMemo(
      () =>
        useLongPress({
          onClick: () => onUrlClick(url.id),
          onLongPress: () => onLongPress(url.id),
          duration: 500,
          disabled: false,
          visualFeedback: true,
        }),
      [onUrlClick, onLongPress, url.id],
    );

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
          {...longPressHandlers}
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
  (prevProps, nextProps) => {
    return (
      prevProps.url.id === nextProps.url.id &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isLoaded === nextProps.isLoaded &&
      prevProps.onUrlClick === nextProps.onUrlClick &&
      prevProps.onLongPress === nextProps.onLongPress
    );
  },
);

// Extract GroupHeader into a memoized component
const GroupHeader = memo(
  forwardRef<
    HTMLDivElement,
    {
      group: UrlGroup;
      isExpanded: boolean;
      onToggle: (groupId: string) => void;
    }
  >((props, ref) => {
    const { group, isExpanded, onToggle } = props;

    const handleClick = useCallback(() => {
      onToggle(group.id);
    }, [onToggle, group.id]);

    return (
      <ListItemButton component="div" ref={ref} onClick={handleClick} data-group-id={group.id}>
        <ListItemText primary={group.name} />
        {isExpanded ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
    );
  }),
  (prevProps, nextProps) => {
    return (
      prevProps.group.id === nextProps.group.id &&
      prevProps.group.name === nextProps.group.name &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.onToggle === nextProps.onToggle
    );
  },
);

GroupHeader.displayName = "GroupHeader";
UrlMenuItem.displayName = "UrlMenuItem";

export function UrlMenu({ urlGroups, initialUrlId, onUrlSelect }: UrlMenuProps) {
  // State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstGroupHeaderRef = useRef<HTMLDivElement>(null);

  const { urls, activeUrlId, selectUrl, unloadUrl } = useUrlManager(urlGroups);

  // Initialize URLs if needed
  useEffect(() => {
    if (initialUrlId) {
      selectUrl(initialUrlId);
    }
  }, [initialUrlId, selectUrl]);

  // Handle URL selection
  const handleUrlClick = useCallback(
    (urlId: string) => {
      selectUrl(urlId);
      onUrlSelect?.(urlId);
    },
    [selectUrl, onUrlSelect],
  );

  // Handle URL unload (long press)
  const handleUrlUnload = useCallback(
    (urlId: string) => {
      unloadUrl(urlId);
    },
    [unloadUrl],
  );

  // Handle group expansion toggle
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

  // Handle search input
  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.toLowerCase());
  }, []);

  // Filter URLs based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return urlGroups;

    return urlGroups
      .map((group) => ({
        ...group,
        urls: group.urls.filter(
          (url) =>
            url.url.toLowerCase().includes(searchQuery) ||
            (url as any).title?.toLowerCase().includes(searchQuery),
        ),
      }))
      .filter((group) => group.urls.length > 0);
  }, [urlGroups, searchQuery]);

  // Focus search input on keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          inputRef={searchInputRef}
          placeholder="Search URLs (Ctrl+K)"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
          }}
        />
      </Box>

      <List
        sx={{
          width: "100%",
          flex: 1,
          overflowY: "auto",
          bgcolor: "background.paper",
        }}
        component="nav"
      >
        {filteredGroups.length === 0 ? (
          <></>
        ) : (
          filteredGroups.map((group) => (
            <Box key={group.id}>
              <GroupHeader
                ref={group === filteredGroups[0] ? firstGroupHeaderRef : undefined}
                group={group}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={handleGroupToggle}
              />
              <Collapse in={expandedGroups.has(group.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding aria-label={`${group.name} URLs`}>
                  {group.urls.map((url) => (
                    <UrlMenuItem
                      key={url.id}
                      url={url as any}
                      isActive={url.id === activeUrlId}
                      isLoaded={urls[url.id]?.isLoaded ?? false}
                      onUrlClick={handleUrlClick}
                      onLongPress={handleUrlUnload}
                    />
                  ))}
                </List>
              </Collapse>
            </Box>
          ))
        )}
      </List>
    </Box>
  );
}
