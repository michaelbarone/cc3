"use client";

import {
  ArrowBack as ArrowBackIcon,
  Backup as BackupIcon,
  BarChart as BarChartIcon,
  BrandingWatermark as BrandingIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Link as LinkIcon,
  List as ListIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

// Sidebar width
const DRAWER_WIDTH = 260;

// Define navigation items
const navigationItems = [
  { name: "Admin Dashboard", path: "/admin", icon: <DashboardIcon /> },
  { name: "User Management", path: "/admin/users", icon: <PeopleIcon /> },
  { name: "URL Groups", path: "/admin/url-groups", icon: <ListIcon /> },
  { name: "Global URLs", path: "/admin/global-urls", icon: <LinkIcon /> },
  { name: "Application Branding", path: "/admin/branding", icon: <BrandingIcon /> },
  { name: "Application Settings", path: "/admin/settings", icon: <SettingsIcon /> },
  { name: "System Operations", path: "/admin/system/operations", icon: <BackupIcon /> },
  { name: "System Statistics", path: "/admin/stats", icon: <BarChartIcon /> },
  { name: "Activity Log", path: "/admin/activity-log", icon: <HistoryIcon /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Handle navigation item click
  const handleNavItemClick = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* Persistent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Admin header/logo area */}
        <Toolbar sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            Admin Dashboard
          </Typography>
        </Toolbar>

        {/* Navigation list */}
        <List sx={{ py: 1, flexGrow: 1 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavItemClick(item.path)}
                sx={{
                  borderRight: pathname === item.path ? 4 : 0,
                  borderColor: "primary.main",
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Back to Dashboard button at bottom */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            fullWidth
            onClick={() => router.push("/dashboard")}
            sx={{ justifyContent: "flex-start" }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
