"use client";

import AppHeader from "@/app/components/AppHeader";
import IframeContainer from "@/app/components/iframe/IframeContainer";
import SideMenuNavigation from "@/app/components/SideMenuNavigation";
import UrlItem from "@/app/components/UrlItem";
import { IframeProvider, useIframeManager } from "@/app/contexts/IframeProvider";
import { useUserPreferences } from "@/app/contexts/UserPreferencesProvider";
import { Url, UrlGroup } from "@/app/types/url";
import { MenuPosition } from "@/app/types/user-settings";
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
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";

// Wrapper component that provides the iframe context
function DashboardContent() {
  const [groups, setGroups] = useState<UrlGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { setActiveUrl, isUrlLoaded } = useIframeManager();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: session } = useSession();
  const { menuPosition } = useUserPreferences();

  // Load expanded group from localStorage on component mount
  useEffect(() => {
    const savedExpandedGroupId = localStorage.getItem("mobileExpandedGroupId");
    if (savedExpandedGroupId) {
      setExpandedGroupId(savedExpandedGroupId);
    }
  }, []);

  // Save expanded group to localStorage when it changes
  useEffect(() => {
    if (expandedGroupId) {
      localStorage.setItem("mobileExpandedGroupId", expandedGroupId);
    }
  }, [expandedGroupId]);

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
        if (data.length > 0) {
          // Set the group ID first
          setSelectedGroupId(data[0].id);
          setExpandedGroupId(data[0].id);

          // Then activate the first URL if it exists
          if (data[0].urls.length > 0) {
            const firstUrl = data[0].urls[0];
            setActiveUrl(firstUrl.urlId, firstUrl.url);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching URL groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, [setActiveUrl]);

  // Handle URL selection
  const handleUrlClick = useCallback(
    (url: Url) => {
      setActiveUrl(url.urlId, url.url);

      // Find the group that contains the URL and update selected group
      const group = groups.find((g) => g.urls.some((u) => u.urlId === url.urlId));
      if (group) {
        setSelectedGroupId(group.id);
      }

      // Close mobile drawer when URL is selected
      if (isMobile) {
        setMobileDrawerOpen(false);
      }
    },
    [setActiveUrl, groups, isMobile],
  );

  // Handle group change
  const handleGroupChange = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setExpandedGroupId(groupId);
  }, []);

  // Toggle group expansion in the drawer
  const handleToggleGroup = (groupId: string) => {
    const newExpandedGroupId = expandedGroupId === groupId ? null : groupId;
    setExpandedGroupId(newExpandedGroupId);

    // Save to localStorage
    if (newExpandedGroupId) {
      localStorage.setItem("mobileExpandedGroupId", newExpandedGroupId);
    } else {
      localStorage.removeItem("mobileExpandedGroupId");
    }
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
        <AppHeader
          onDrawerToggle={handleDrawerToggle}
          menuPosition={menuPosition}
          urlGroups={groups}
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
        />
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="h5">No content available</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            You don't have access to any URL groups yet. Please contact your administrator.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render URL items for the drawer/navigation
  const renderUrlItems = (urls: Url[], groupId: string) => {
    return urls.map((url) => (
      <UrlItem
        key={url.id}
        url={url}
        groupId={groupId}
        onGroupChange={handleGroupChange}
        onClick={() => setMobileDrawerOpen(false)}
      />
    ));
  };

  // Drawer content for mobile
  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        {groups.map((group) => (
          <React.Fragment key={group.id}>
            <ListItemButton
              onClick={() => handleToggleGroup(group.id)}
              sx={{
                borderRadius: 0,
                my: 0,
              }}
            >
              <ListItemText
                primary={group.name}
                primaryTypographyProps={{
                  fontWeight: selectedGroupId === group.id ? "bold" : "normal",
                }}
              />
              {expandedGroupId === group.id ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={expandedGroupId === group.id} timeout={300} unmountOnExit>
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
      {/* Render AppHeader only if menuPosition is TOP or on mobile */}
      {(menuPosition === MenuPosition.TOP || isMobile) && (
        <AppHeader
          onDrawerToggle={handleDrawerToggle}
          menuPosition={menuPosition}
          urlGroups={groups}
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
        />
      )}

      {/* Render side menu when menuPosition is SIDE and not mobile */}
      {menuPosition === MenuPosition.SIDE && !isMobile && (
        <SideMenuNavigation
          groups={groups}
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: menuPosition === MenuPosition.TOP ? "calc(100vh - 64px)" : "100vh", // Adjust height based on menu position
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 250,
              transition: "all 0.3s ease",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Iframe container */}
        <IframeContainer height="100%" />
      </Box>
    </Box>
  );
}

// Export the Dashboard with IframeProvider
export default function Dashboard() {
  return (
    <IframeProvider>
      <DashboardContent />
    </IframeProvider>
  );
}
