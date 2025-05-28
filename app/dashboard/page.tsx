"use client";

import AppHeader from "@/app/components/AppHeader";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  Box,
  CircularProgress,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

interface Url {
  id: string;
  urlId: string;
  title: string;
  url: string;
  faviconUrl: string | null;
  mobileSpecificUrl: string | null;
  displayOrderInGroup: number;
  createdAt: string;
  updatedAt: string;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
  urls: Url[];
}

export default function Dashboard() {
  const [groups, setGroups] = useState<UrlGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Fetch user's accessible URL groups
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const response = await fetch("/api/dashboard/urlGroups");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setGroups(data);

        // Set first URL of first group as active by default
        if (data.length > 0 && data[0].urls.length > 0) {
          setActiveUrl(data[0].urls[0]);
          setLoadedUrls(new Set([data[0].urls[0].urlId]));
          setExpandedGroupId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching URL groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, []);

  // Handle URL selection
  const handleUrlClick = (url: Url) => {
    setActiveUrl(url);

    // Add to loaded URLs set
    setLoadedUrls((prev) => {
      const newSet = new Set(prev);
      newSet.add(url.urlId);
      return newSet;
    });

    // Close mobile drawer when URL is selected
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Toggle group expansion in the drawer
  const handleToggleGroup = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  // Toggle mobile drawer
  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  // Render loading state
  if (loading) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error loading content
        </Typography>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  // Render empty state
  if (groups.length === 0 || groups.every((group) => group.urls.length === 0)) {
    return (
      <Box sx={{ p: 3 }}>
        <AppHeader />
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="h5">No content available</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            You don't have access to any URL groups yet. Please contact your administrator.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Prepare URL content
  const renderIframes = () => {
    const allUrls: Url[] = groups.flatMap((group) => group.urls);

    return allUrls.map((url) => {
      const isActive = activeUrl?.id === url.id;
      const isLoaded = loadedUrls.has(url.urlId);

      return (
        <Box
          key={url.id}
          ref={(el: HTMLDivElement | null) => {
            if (el) {
              const iframe = el.querySelector<HTMLIFrameElement>("iframe");
              if (iframe) {
                iframeRefs.current[url.id] = iframe;
              }
            }
          }}
          sx={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            visibility: isActive ? "visible" : "hidden",
          }}
        >
          {isLoaded && (
            <iframe
              src={url.url}
              title={url.title}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-popups-to-escape-sandbox"
            />
          )}
        </Box>
      );
    });
  };

  // Render URL items for the drawer/navigation
  const renderUrlItems = (urls: Url[], groupId: string) => {
    return urls.map((url) => {
      const isActive = activeUrl?.id === url.id;
      const isLoaded = loadedUrls.has(url.urlId);

      return (
        <ListItemButton
          key={url.id}
          selected={isActive}
          onClick={() => handleUrlClick(url)}
          sx={{
            pl: 4,
            opacity: isLoaded ? 1 : 0.5,
            borderRight: isActive ? `4px solid ${theme.palette.primary.main}` : "none",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            {url.faviconUrl ? (
              <Box sx={{ mr: 1, width: 16, height: 16, position: "relative" }}>
                <Image
                  src={url.faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  style={{ objectFit: "contain" }}
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </Box>
            ) : null}
            <ListItemText primary={url.title} />
          </Box>
        </ListItemButton>
      );
    });
  };

  // Drawer content for mobile
  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        {groups.map((group) => (
          <React.Fragment key={group.id}>
            <ListItemButton onClick={() => handleToggleGroup(group.id)}>
              <ListItemText primary={group.name} />
              {expandedGroupId === group.id ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={expandedGroupId === group.id} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderUrlItems(group.urls, group.id)}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppHeader />

      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Main content area with iframes */}
        <Box sx={{ flexGrow: 1, position: "relative" }}>{renderIframes()}</Box>
      </Box>
    </Box>
  );
}
