import TopMenuNavigation from "@/app/components/TopMenuNavigation";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface AppHeaderProps {
  menuPosition?: "TOP" | "SIDE";
  onDrawerToggle?: () => void;
  urlGroups?: any[];
  selectedGroupId?: string | null;
  onGroupChange?: (groupId: string) => void;
}

export default function AppHeader({
  menuPosition = "TOP",
  onDrawerToggle,
  urlGroups = [],
  selectedGroupId = null,
  onGroupChange = () => {},
}: AppHeaderProps) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const pathname = usePathname();

  // Decide whether to show the header based on menuPosition and screen size
  const showHeader = isMobile || menuPosition === "TOP";

  // Check if user has admin access
  const isAdmin = session?.user?.role === "ADMIN";

  const handleDrawerToggle = () => {
    if (onDrawerToggle) {
      onDrawerToggle();
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await signOut({ callbackUrl: "/login" });
  };

  const toggleTheme = () => {
    // This will be implemented with proper theme context in Story 4.1
    // For now, just close the menu
    handleUserMenuClose();
  };

  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        <ListItem>
          <Typography variant="h6" component="div">
            Control Center
          </Typography>
        </ListItem>
        <Divider />
        <ListItemButton
          component={Link}
          href="/dashboard"
          selected={pathname === "/dashboard"}
          onClick={() => setMobileOpen(false)}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton
          component={Link}
          href="/settings/profile"
          selected={pathname.startsWith("/settings")}
          onClick={() => setMobileOpen(false)}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
        {isAdmin && (
          <ListItemButton
            component={Link}
            href="/admin"
            selected={pathname.startsWith("/admin")}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  if (!showHeader) return null;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 0, display: { xs: "none", sm: "block" } }}
          >
            Control Center
          </Typography>

          {/* Central navigation area */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            {!isMobile && menuPosition === "TOP" && (
              <>
                {/* Main app navigation buttons */}
                <Box sx={{ display: "flex", mr: 2 }}>
                  <Button
                    color="inherit"
                    component={Link}
                    href="/dashboard"
                    sx={{
                      textTransform: "none",
                      borderBottom: pathname === "/dashboard" ? "2px solid" : "none",
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    color="inherit"
                    component={Link}
                    href="/settings/profile"
                    sx={{
                      textTransform: "none",
                      borderBottom: pathname.startsWith("/settings") ? "2px solid" : "none",
                    }}
                  >
                    Settings
                  </Button>
                  {isAdmin && (
                    <Button
                      color="inherit"
                      component={Link}
                      href="/admin"
                      sx={{
                        textTransform: "none",
                        borderBottom: pathname.startsWith("/admin") ? "2px solid" : "none",
                      }}
                    >
                      Admin
                    </Button>
                  )}
                </Box>

                {/* Top Menu URL Navigation */}
                {pathname === "/dashboard" && urlGroups.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexGrow: 1,
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    <TopMenuNavigation
                      groups={urlGroups}
                      selectedGroupId={selectedGroupId}
                      onGroupChange={onGroupChange}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* User menu */}
          <Box>
            <Tooltip title="Account menu">
              <IconButton
                onClick={handleUserMenuOpen}
                color="inherit"
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
              >
                <AccountCircleIcon />
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={userMenuAnchor}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
            >
              <MenuItem component={Link} href="/dashboard" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                Dashboard
              </MenuItem>
              <MenuItem component={Link} href="/settings/profile" onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              {isAdmin && (
                <MenuItem component={Link} href="/admin" onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <AdminPanelSettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Admin
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={toggleTheme}>
                <ListItemIcon>
                  {theme.palette.mode === "dark" ? (
                    <LightModeIcon fontSize="small" />
                  ) : (
                    <DarkModeIcon fontSize="small" />
                  )}
                </ListItemIcon>
                {theme.palette.mode === "dark" ? "Light Mode" : "Dark Mode"}
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
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
    </>
  );
}
