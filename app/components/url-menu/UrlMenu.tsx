"use client";

import { useUrlManager } from "@/app/lib/hooks/useIframe";
import { useLastActiveUrl } from "@/app/lib/hooks/useLastActiveUrl";
import { useLongPress } from "@/app/lib/hooks/useLongPress";
import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import type { IframeContainerRef, UrlGroup } from "@/app/types/iframe";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
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
  type RefObject,
} from "react";
import { LongPressProgress } from "./LongPressProgress";

interface UrlMenuProps {
  urlGroups: UrlGroup[];
  initialUrlId?: string;
  onUrlSelect?: (urlId: string) => void;
  iframeContainerRef?: RefObject<IframeContainerRef>;
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
    // Use the hook directly at the top level, not inside useMemo
    const longPressHandlers = useLongPress({
      onClick: () => onUrlClick(url.id),
      onLongPress: () => onLongPress(url.id),
      duration: 2000,
      disabled: false,
      visualFeedback: true,
    });

    // Convert legacy icon paths to API paths if needed
    const iconPath = url.iconPath
      ? url.iconPath.startsWith("/api/public/")
        ? url.iconPath
        : url.iconPath.startsWith("/icons/")
          ? `/api/public${url.iconPath}`
          : url.iconPath
      : null;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const tooltipUrl = url.isLocalhost
      ? getEffectiveUrl(
          {
            id: url.id,
            url: url.url,
            urlMobile: url.urlMobile,
            isLocalhost: true,
            port: url.port || null,
            path: url.path || null,
            localhostMobilePath: url.localhostMobilePath || null,
            localhostMobilePort: url.localhostMobilePort || null,
          },
          isMobile,
        )
      : url.url;

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
            pl: isMobile ? 3 : 4,
            position: "relative",
            borderRight: isActive ? 3 : 0,
            borderColor: "primary.main",
          }}
        >
          {iconPath && (
            <Box
              component="img"
              src={iconPath}
              alt=""
              sx={{
                width: 20,
                height: 20,
                objectFit: "contain",
                mr: 1.5,
                flexShrink: 0,
              }}
            />
          )}
          <ListItemText
            primary={url.title || url.url}
            secondary={tooltipUrl}
            primaryTypographyProps={{
              fontWeight: isActive ? "bold" : "normal",
            }}
          />
          <LongPressProgress
            progress={longPressHandlers.progress}
            isActive={longPressHandlers.isLongPressing}
          />
        </ListItemButton>
      </ListItem>
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
);

GroupHeader.displayName = "GroupHeader";
UrlMenuItem.displayName = "UrlMenuItem";

export const UrlMenu = memo(function UrlMenu({
  urlGroups,
  initialUrlId,
  onUrlSelect,
  iframeContainerRef,
}: UrlMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstGroupHeaderRef = useRef<HTMLDivElement>(null);
  const { updateLastActiveUrl } = useLastActiveUrl();

  // Use useEffect for client-side state initialization
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { urls, activeUrlId, selectUrl, unloadUrl } = useUrlManager(urlGroups);

  // Initialize URLs if needed
  useEffect(() => {
    if (initialUrlId && mounted) {
      selectUrl(initialUrlId);
    }
  }, [initialUrlId, selectUrl, mounted]);

  // Add this ref at the component level
  const lastClickRef = useRef<{ time: number; urlId: string }>({ time: 0, urlId: "" });

  // Handle URL selection
  const handleUrlClick = useCallback(
    (urlId: string) => {
      // Add debounce to prevent double-clicks
      const now = Date.now();

      // If this is a duplicate click within 300ms, ignore it
      if (now - lastClickRef.current.time < 300 && lastClickRef.current.urlId === urlId) {
        // console.log("Ignoring duplicate click");
        return;
      }

      // Update last click time and URL
      lastClickRef.current = { time: now, urlId };

      const isActive = urlId === activeUrlId;
      const isLoaded = urls[urlId]?.isLoaded ?? false;

      // console.log(
      //   isActive ? "active" : "not active",
      //   isLoaded ? "and loaded" : "but not loaded",
      //   urlId,
      // );

      if (isActive && isLoaded) {
        // console.log("active and loaded - reset it", urlId);
        // If the URL is already active and loaded, the user is clicking
        // to refresh the content, so we should reset the iframe
        if (iframeContainerRef?.current) {
          iframeContainerRef.current.resetIframe(urlId);
        }
      } else if (isActive && !isLoaded) {
        // console.log("active but not loaded - load it", urlId);
        // If active but not loaded, load it
        if (iframeContainerRef?.current) {
          iframeContainerRef.current.reloadUnloadedIframe(urlId);
        } else {
          selectUrl(urlId);
        }
      } else {
        // console.log("not active - make it active", urlId);
        // Not active - make it active
        selectUrl(urlId);
      }

      // Update the last active URL when a URL is selected
      updateLastActiveUrl(urlId);
      onUrlSelect?.(urlId);
    },
    [selectUrl, onUrlSelect, updateLastActiveUrl, activeUrlId, urls, iframeContainerRef],
  );

  // Handle URL unload (long press)
  const handleUrlUnload = useCallback(
    (urlId: string) => {
      if (iframeContainerRef?.current) {
        iframeContainerRef.current.unloadIframe(urlId);
      } else {
        unloadUrl(urlId);
      }
    },
    [unloadUrl, iframeContainerRef],
  );

  // Find the group containing the active URL
  const activeGroupId = useMemo(() => {
    if (!activeUrlId) return null;

    const group = urlGroups.find((group) => group.urls.some((url) => url.id === activeUrlId));

    return group?.id || null;
  }, [activeUrlId, urlGroups]);

  // Ensure the active group is expanded when the active URL changes
  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        next.add(activeGroupId);
        return next;
      });
    }
  }, [activeGroupId]);

  // Modify the handleGroupToggle function to prevent collapsing the active group
  const handleGroupToggle = useCallback(
    (groupId: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);

        // If this is the active group, don't allow it to be collapsed
        // if (groupId === activeGroupId) {
        //   next.add(groupId);
        //   return next;
        // }

        // Otherwise toggle as normal
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    },
    [activeGroupId],
  );

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
            (url.title || "").toLowerCase().includes(searchQuery),
        ),
      }))
      .filter((group) => group.urls.length > 0);
  }, [urlGroups, searchQuery]);

  // Render URL items with appropriate state
  const renderUrlItem = useCallback(
    (url: UrlGroup["urls"][0]) => {
      const isActive = url.id === activeUrlId;
      const isLoaded = urls[url.id]?.isLoaded ?? false;

      return (
        <UrlMenuItem
          key={url.id}
          url={{ ...url, title: url.title || url.url }}
          isActive={isActive}
          isLoaded={isLoaded}
          onUrlClick={() => handleUrlClick(url.id)}
          onLongPress={() => handleUrlUnload(url.id)}
        />
      );
    },
    [activeUrlId, urls, handleUrlClick, handleUrlUnload],
  );

  // Focus search input on keyboard shortcut
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted]);

  // Prevent hydration mismatch by not rendering anything on the server
  if (!mounted) {
    return (
      <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <List
          sx={{
            width: "100%",
            flex: 1,
            overflowY: "auto",
            bgcolor: "background.paper",
          }}
          component="nav"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search functionality is commented out for now */}
      {/* <Box sx={{ p: 1 }}>
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
      </Box> */}

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
                  {group.urls.map(renderUrlItem)}
                </List>
              </Collapse>
            </Box>
          ))
        )}
      </List>
    </Box>
  );
});
