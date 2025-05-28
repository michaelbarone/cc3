"use client";

import UrlItem from "@/app/components/UrlItem";
import { useIframeManager } from "@/app/contexts/IframeProvider";
import { Url } from "@/app/types/url";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { getUserInitials } from "../utils/userUtils";

export interface SideMenuNavigationProps {
  groups: {
    id: string;
    name: string;
    urls: Url[];
  }[];
  selectedGroupId: string | null;
  onGroupChange: (groupId: string) => void;
  width?: number;
}

/**
 * Side Menu Navigation component for desktop when menuPosition is SIDE
 */
export default function SideMenuNavigation({
  groups,
  selectedGroupId,
  onGroupChange,
  width = 250,
}: SideMenuNavigationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const { data: session } = useSession();
  const { activeUrlIdentifier, isUrlLoaded, setActiveUrl } = useIframeManager();
  const pathname = usePathname();

  // State for collapsible panel
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State to track expanded groups in accordion
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Width for collapsed and expanded states
  const collapsedWidth = 72;
  const expandedWidth = width;

  // Initialize state from localStorage if available
  useEffect(() => {
    const savedState = localStorage.getItem("sideMenuCollapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }

    // Initialize expandedGroups with selectedGroupId
    if (selectedGroupId) {
      setExpandedGroups(new Set([selectedGroupId]));
    }
  }, [selectedGroupId]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("sideMenuCollapsed", isCollapsed.toString());
  }, [isCollapsed]);

  // Toggle collapsed state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  };

  // Handle URL click
  const handleUrlClick = useCallback(
    (url: Url, groupId: string) => {
      setActiveUrl(url.urlId, url.url);
      if (groupId !== selectedGroupId) {
        onGroupChange(groupId);
      }
    },
    [setActiveUrl, selectedGroupId, onGroupChange],
  );

  // Handle logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN";

  // Determine current panel width
  const currentWidth = isCollapsed ? collapsedWidth : expandedWidth;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: currentWidth,
          boxSizing: "border-box",
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          overflowX: "hidden",
        },
      }}
    >
      {/* App logo and collapse toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          p: isCollapsed ? 1 : 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!isCollapsed && (
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Control Center
          </Typography>
        )}
        <Tooltip title={isCollapsed ? "Expand menu" : "Collapse menu"}>
          <IconButton onClick={toggleCollapse}>
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* URL Groups and URLs */}
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        <List
          sx={{
            p: 1,
            "& .MuiListItemButton-root": {
              borderRadius: "8px",
              mb: 0.5,
            },
          }}
        >
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <ListItemButton
                onClick={() => toggleGroupExpansion(group.id)}
                sx={{
                  px: isCollapsed ? 1 : 2,
                  py: 1,
                  minHeight: 48,
                  justifyContent: isCollapsed ? "center" : "initial",
                }}
              >
                {isCollapsed ? (
                  <Tooltip title={group.name} placement="right">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: theme.palette.primary.main,
                        fontSize: "0.875rem",
                      }}
                    >
                      {getUserInitials(group.name)}
                    </Avatar>
                  </Tooltip>
                ) : (
                  <>
                    <ListItemText primary={group.name} />
                    {expandedGroups.has(group.id) ? <ExpandLess /> : <ExpandMore />}
                  </>
                )}
              </ListItemButton>

              <Collapse
                in={!isCollapsed && expandedGroups.has(group.id)}
                timeout="auto"
                unmountOnExit
              >
                <List component="div" disablePadding>
                  {group.urls.map((url) => (
                    <UrlItem
                      key={url.id}
                      url={url}
                      groupId={group.id}
                      onGroupChange={onGroupChange}
                    />
                  ))}
                </List>
              </Collapse>

              {/* Collapsed state URL display - only shows icons */}
              {isCollapsed && expandedGroups.has(group.id) && (
                <List component="div" disablePadding>
                  {group.urls.map((url) => (
                    <UrlItem
                      key={url.id}
                      url={url}
                      groupId={group.id}
                      onGroupChange={onGroupChange}
                      isCompact
                      showTooltip
                    />
                  ))}
                </List>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* User Menu Section */}
      <Divider />
      <List
        sx={{
          p: 1,
          "& .MuiListItemButton-root": {
            borderRadius: "8px",
            mb: 0.5,
          },
        }}
      >
        <ListItemButton
          component={Link}
          href="/dashboard"
          selected={pathname === "/dashboard"}
          sx={{
            px: isCollapsed ? 1 : 2,
            py: 1,
            minHeight: 48,
            justifyContent: isCollapsed ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
            <DashboardIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Dashboard" />}
        </ListItemButton>

        <ListItemButton
          component={Link}
          href="/settings/profile"
          selected={pathname.startsWith("/settings")}
          sx={{
            px: isCollapsed ? 1 : 2,
            py: 1,
            minHeight: 48,
            justifyContent: isCollapsed ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
            <SettingsIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Settings" />}
        </ListItemButton>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            px: isCollapsed ? 1 : 2,
            py: 1,
            minHeight: 48,
            justifyContent: isCollapsed ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Logout" />}
        </ListItemButton>
      </List>
    </Drawer>
  );
}
