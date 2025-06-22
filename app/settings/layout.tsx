"use client";

import UserMenu from "@/app/components/ui/UserMenu";
import { AppConfig, DEFAULT_APP_CONFIG } from "@/app/lib/utils/constants";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BrushIcon from "@mui/icons-material/Brush";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LockIcon from "@mui/icons-material/Lock";
import MenuIcon from "@mui/icons-material/Menu";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const drawerWidth = 240;

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const appBarHeight = isMobile ? 56 : 64; // AppBar height changes at small screens

  // Set viewport height CSS variable
  useEffect(() => {
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    };

    // Initial update
    updateViewportHeight();

    // Update on resize
    window.addEventListener("resize", updateViewportHeight);

    // Update on keyboard appearance
    window.addEventListener("focusin", updateViewportHeight);
    window.addEventListener("focusout", updateViewportHeight);

    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("focusin", updateViewportHeight);
      window.removeEventListener("focusout", updateViewportHeight);
    };
  }, []);

  // Fetch app configuration
  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await fetch("/api/admin/app-config");
        if (response.ok) {
          const data = await response.json();
          setAppConfig(data);
        }
      } catch (error) {
        console.error("Error fetching app config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppConfig();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: "Profile", icon: <AccountCircleIcon />, href: "/settings/profile" },
    { text: "Password", icon: <LockIcon />, href: "/settings/password" },
    { text: "Appearance", icon: <BrushIcon />, href: "/settings/appearance" },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {appConfig.appLogo && (
            <Box
              sx={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 1,
                borderRadius: "4px",
                overflow: "hidden",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "background.paper" : "transparent",
              }}
            >
              <Box
                component="img"
                src={appConfig.appLogo}
                alt="Logo"
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
                onError={(e) => {
                  // Hide the image if it fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </Box>
          )}
          <Typography variant="h6" noWrap component="div">
            User Settings
          </Typography>
        </Box>
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
                <ListItemText primary={item.text} primaryTypographyProps={{ component: "div" }} />
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

          {/* Spacer to push elements to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Dashboard button to return to main dashboard */}
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => router.replace("/dashboard")}
            sx={{ mr: 1 }}
          >
            Dashboard
          </Button>

          <UserMenu showAdminOption />
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
            zIndex: (theme) => theme.zIndex.drawer + 4,
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
          marginTop: `${appBarHeight}px`,
          height: `calc(var(--vh, 1vh) * 100 - ${appBarHeight}px)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: appBarHeight, // Dynamic AppBar height
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
