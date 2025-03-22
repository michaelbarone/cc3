"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import LinkIcon from "@mui/icons-material/Link";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

const drawerWidth = 240;

interface AdminLayoutClientProps {
  children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleBackToDashboard = () => {
    router.replace("/dashboard");
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, href: "/admin" },
    { text: "User Management", icon: <PeopleIcon />, href: "/admin/users" },
    { text: "URLs", icon: <LinkIcon />, href: "/admin/urls" },
    { text: "URL Groups", icon: <FolderIcon />, href: "/admin/url-groups" },
    { text: "App Configuration", icon: <SettingsIcon />, href: "/admin/app-config" },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Admin Panel
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <Box
              component="div"
              onClick={() => router.replace(item.href)}
              sx={{
                textDecoration: "none",
                color: "inherit",
                width: "100%",
                cursor: "pointer",
                display: "block",
              }}
            >
              <ListItemButton selected={pathname === item.href}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.href === pathname)?.text || "Admin"}
          </Typography>
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: "64px",
          height: "calc(100vh - 64px)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 64, // AppBar height
            left: { sm: drawerWidth, xs: 0 },
            right: 0,
            bottom: 0,
            bgcolor: "background.default",
            zIndex: (theme) => theme.zIndex.drawer + 2,
          }}
        />
        <Box
          sx={{
            height: "100%",
            overflow: "auto",
            position: "relative",
            zIndex: (theme) => theme.zIndex.drawer + 3,
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
