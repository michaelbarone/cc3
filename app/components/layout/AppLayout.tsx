"use client";

import UserMenu from "@/app/components/ui/UserMenu";
import { useAuth } from "@/app/lib/auth/auth-context";
import { useUrlGroups } from "@/app/lib/hooks/useUrlGroups";
import { useUserPreferences } from "@/app/lib/hooks/useUserPreferences";
import { ThemeContext } from "@/app/theme/theme-provider";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Drawer, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const DRAWER_WIDTH = 240;

interface AppConfig {
  appName: string;
  appLogo: string | null;
}

interface AppLayoutProps {
  children: ReactNode;
  menuContent: ReactNode;
  forceMenuPosition?: "side" | "top" | null;
  headerContent?: ReactNode;
}

export default function AppLayout({
  children,
  menuContent,
  forceMenuPosition = null,
  headerContent = null,
}: AppLayoutProps) {
  const { user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const { urlGroups, isLoading: urlGroupsLoading } = useUrlGroups();
  const router = useRouter();
  const theme = useTheme();
  const colorMode = useContext(ThemeContext);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    appName: "Control Center",
    appLogo: null,
  });
  const [appConfigLoading, setAppConfigLoading] = useState(true);

  // Check if menu should be shown
  const showMenu = useMemo(() => {
    return menuContent !== null && (!urlGroups || urlGroups.length > 0);
  }, [menuContent, urlGroups]);

  // Handle initial mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle mobile detection with useLayoutEffect to avoid flicker
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const isMobileView = window.innerWidth < 600;
      setIsMobile(isMobileView);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine effective menu position
  const effectiveMenuPosition = useMemo(() => {
    if (!mounted) return undefined; // Default before hydration
    if (preferencesLoading) return undefined; // Default while loading
    if (isMobile) return "top"; // Force top menu on mobile
    if (forceMenuPosition) return forceMenuPosition;
    return preferences?.menuPosition || undefined;
  }, [mounted, preferences?.menuPosition, forceMenuPosition, preferencesLoading, isMobile]);

  // Handle drawer toggle
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Fetch app configuration
  useEffect(() => {
    const fetchAppConfig = async () => {
      setAppConfigLoading(true);
      try {
        const response = await fetch("/api/admin/app-config");
        if (response.ok) {
          const data = await response.json();
          setAppConfig(data);
        }
      } catch (error) {
        console.error("Error fetching app configuration:", error);
      } finally {
        setAppConfigLoading(false);
      }
    };

    fetchAppConfig();
  }, []);

  // Render app logo or name based on config
  const renderAppLogoOrName = () => {
    if (appConfigLoading) {
      return <></>;
    }

    if (appConfig.appLogo) {
      return (
        <Box
          component="img"
          src={appConfig.appLogo}
          alt={appConfig.appName}
          sx={{
            height: 40,
            maxWidth: { xs: 120, sm: 160 },
            objectFit: "contain",
            ...(effectiveMenuPosition === "top" ? { mr: { xs: 1, md: 4 } } : {}),
          }}
        />
      );
    }

    return (
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{
          ...(effectiveMenuPosition === "top" ? { mr: { xs: 1, md: 4 } } : {}),
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        {appConfig.appName}
      </Typography>
    );
  };

  // If not mounted yet, render a minimal layout to match SSR
  if (!mounted || !effectiveMenuPosition) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }}
        >
          <Toolbar>{renderAppLogoOrName()}</Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            mt: "64px",
            height: "calc(100vh - 64px)",
            overflow: "hidden",
          }}
        />
      </Box>
    );
  }

  // TODO combine top and side menu layouts and just use effectiveMenuPosition to hide/show just the menu
  // Render the top menu layout
  if (effectiveMenuPosition === "top") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }}
        >
          <Toolbar sx={{ display: "flex" }}>
            {/* Left section - Mobile menu toggle and app logo */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {/* Mobile menu toggle */}
              {showMenu && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{
                    mr: 2,
                    display: { md: "none" },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              {/* App Logo/Title */}
              {renderAppLogoOrName()}
            </Box>

            {/* Center section - Menu content */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexGrow: 1,
                overflow: "auto",
                whiteSpace: "nowrap",
              }}
            >
              {menuContent}
            </Box>

            {/* Header content (Dashboard button, etc.) */}
            {headerContent && <Box>{headerContent}</Box>}

            {/* Right section - User menu and theme toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                ml: "auto",
              }}
            >
              {user && <UserMenu showAdminOption />}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Mobile drawer - always use side layout regardless of preference */}
        {showMenu && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: DRAWER_WIDTH,
                backgroundColor: theme.palette.background.default,
              },
            }}
          >
            <Toolbar sx={{ display: "flex", justifyContent: "flex-end" }}>
              <IconButton onClick={handleDrawerToggle}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
            {menuContent}
          </Drawer>
        )}

        {/* Main content area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            mt: "64px", // Height of the AppBar
            height: "calc(100vh - 64px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  // Render the side menu layout
  if (effectiveMenuPosition === "side") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* App Bar - full width */}
        <AppBar
          position="fixed"
          sx={{
            width: "100%",
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }}
        >
          <Toolbar sx={{ display: "flex" }}>
            {/* Left section - Mobile menu toggle and app logo */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {/* Mobile menu toggle */}
              {showMenu && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{
                    mr: 2,
                    display: { xs: "block", md: "none" },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              {/* App Logo/Title */}
              {renderAppLogoOrName()}
            </Box>

            {/* Spacer to push elements to the right */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Header content (Dashboard button, etc.) */}
            {headerContent && <Box>{headerContent}</Box>}

            {/* Right section - User menu and theme toggle */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {user && <UserMenu showAdminOption />}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main content with side menu and content area */}
        <Box sx={{ display: "flex", flexGrow: 1, pt: "64px", height: "calc(100vh - 64px)" }}>
          {/* Side Navigation */}
          {showMenu && (
            <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
              {/* Mobile drawer */}
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true, // Better open performance on mobile
                }}
                sx={{
                  display: { xs: "block", md: "none" },
                  "& .MuiDrawer-paper": {
                    boxSizing: "border-box",
                    width: DRAWER_WIDTH,
                    backgroundColor: theme.palette.background.default,
                  },
                }}
              >
                <Toolbar sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                  </IconButton>
                </Toolbar>
                {menuContent}
              </Drawer>

              {/* Desktop drawer - always visible */}
              <Drawer
                variant="permanent"
                sx={{
                  display: { xs: "none", md: "block" },
                  "& .MuiDrawer-paper": {
                    boxSizing: "border-box",
                    width: DRAWER_WIDTH,
                    height: "calc(100vh - 64px)",
                    top: "64px",
                    backgroundColor: theme.palette.background.default,
                    borderRight: `1px solid ${theme.palette.divider}`,
                  },
                }}
                open
              >
                {menuContent}
              </Drawer>
            </Box>
          )}

          {/* Main content area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0,
              height: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    );
  }
}
