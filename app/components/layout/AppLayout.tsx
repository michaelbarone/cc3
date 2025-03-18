'use client';

import { useState, ReactNode, useEffect } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Drawer, useTheme, Menu, MenuItem, Divider, useMediaQuery, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { ThemeContext } from '@/app/theme/theme-provider';
import { useAuth } from '@/app/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';

const DRAWER_WIDTH = 240;

interface AppConfig {
  appName: string;
  appLogo: string | null;
}

interface AppLayoutProps {
  children: ReactNode;
  menuContent: ReactNode;
  forceMenuPosition?: 'side' | 'top'; // Optional prop to force a specific menu position
}

export default function AppLayout({ children, menuContent, forceMenuPosition }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const router = useRouter();
  const theme = useTheme();
  const colorMode = useContext(ThemeContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<'side' | 'top'>(forceMenuPosition || 'side');
  const [appConfig, setAppConfig] = useState<AppConfig>({ appName: 'Control Center', appLogo: null });

  // Add check for mobile screens
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const userMenuOpen = Boolean(userMenuAnchorEl);

  // Load menu position from user preferences unless a forced position is provided
  useEffect(() => {
    // For mobile devices, always use side menu for drawer regardless of preference
    if (isMobile) {
      setMenuPosition('side');
      return;
    }

    if (forceMenuPosition) {
      setMenuPosition(forceMenuPosition);
    } else if (preferences.menuPosition) {
      setMenuPosition(preferences.menuPosition);
    } else {
      setMenuPosition('side');
    }
  }, [preferences.menuPosition, forceMenuPosition, isMobile]);

  // Fetch app configuration
  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await fetch('/api/admin/app-config');
        if (response.ok) {
          const data = await response.json();
          setAppConfig(data);
        }
      } catch (error) {
        console.error('Error fetching app configuration:', error);
      }
    };

    fetchAppConfig();
  }, []);

  // Event handler functions
  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login?logout=true');
  };

  const navigateToAdmin = () => {
    handleUserMenuClose();
    router.push('/admin');
  };

  const navigateToSettings = () => {
    handleUserMenuClose();
    router.push('/settings');
  };

  const navigateToDashboard = () => {
    handleUserMenuClose();
    router.push('/dashboard');
  };

  // If we're still loading preferences and no forced menu position, render a minimal layout
  if (preferencesLoading && !forceMenuPosition) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary
          }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Loading...
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            mt: '64px',
            height: 'calc(100vh - 64px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Render the top menu layout
  if (menuPosition === 'top') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary
          }}
        >
          <Toolbar sx={{ display: 'flex' }}>
            {/* Left section - Mobile menu toggle and app logo */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Mobile menu toggle */}
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                  mr: 2,
                  display: { md: 'none' }
                }}
              >
                <MenuIcon />
              </IconButton>

              {/* App Logo/Title */}
              {appConfig.appLogo ? (
                <Box
                  component="img"
                  src={appConfig.appLogo}
                  alt={appConfig.appName}
                  sx={{
                    height: 40,
                    maxWidth: { xs: 120, sm: 160 },
                    objectFit: 'contain',
                    mr: { xs: 1, md: 4 }
                  }}
                />
              ) : (
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{
                    mr: { xs: 1, md: 4 },
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  {appConfig.appName}
                </Typography>
              )}
            </Box>

            {/* Center section - Menu content */}
            <Box sx={{
              display: { xs: 'none', md: 'flex' },
              flexGrow: 1,
              overflow: 'auto',
              whiteSpace: 'nowrap'
            }}>
              {menuContent}
            </Box>

            {/* Right section - User menu and theme toggle */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              ml: 'auto'
            }}>
              {user && (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      mr: 2
                    }}
                    onClick={handleUserMenuClick}
                    aria-controls={userMenuOpen ? 'user-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={userMenuOpen ? 'true' : undefined}
                  >
                    <AccountCircleIcon sx={{ mr: { xs: 0, sm: 1 } }} />
                    <Typography
                      variant="body1"
                      sx={{
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      {user.username}
                    </Typography>
                    <ArrowDropDownIcon sx={{ display: { xs: 'none', sm: 'block' } }} />
                  </Box>
                  <Menu
                    id="user-menu"
                    anchorEl={userMenuAnchorEl}
                    open={userMenuOpen}
                    onClose={handleUserMenuClose}
                    MenuListProps={{
                      'aria-labelledby': 'user-button',
                    }}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={navigateToDashboard}>
                      <DashboardIcon sx={{ mr: 1 }} />
                      Dashboard
                    </MenuItem>
                    <MenuItem onClick={navigateToSettings}>
                      <SettingsIcon sx={{ mr: 1 }} />
                      Settings
                    </MenuItem>
                    {user.isAdmin && (
                      <MenuItem onClick={navigateToAdmin}>
                        <AdminPanelSettingsIcon sx={{ mr: 1 }} />
                        Admin Area
                      </MenuItem>
                    )}
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              )}
              <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
                {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Mobile drawer - always use side layout regardless of preference */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: theme.palette.background.default
            },
          }}
        >
          <Toolbar sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
          {menuContent}
        </Drawer>

        {/* Main content area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            mt: '64px', // Height of the AppBar
            height: 'calc(100vh - 64px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  // Default side menu layout
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* App Bar - full width */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary
        }}
      >
        <Toolbar sx={{ display: 'flex' }}>
          {/* Left section - Mobile menu toggle and app logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Mobile menu toggle */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                display: { xs: 'block', md: 'none' }
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* App Logo/Title */}
            {appConfig.appLogo ? (
              <Box
                component="img"
                src={appConfig.appLogo}
                alt={appConfig.appName}
                sx={{
                  height: 40,
                  maxWidth: { xs: 120, sm: 160 },
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                {appConfig.appName}
              </Typography>
            )}
          </Box>

          {/* Spacer to push user menu to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right section - User menu and theme toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    mr: 2
                  }}
                  onClick={handleUserMenuClick}
                  aria-controls={userMenuOpen ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen ? 'true' : undefined}
                >
                  <AccountCircleIcon sx={{ mr: { xs: 0, sm: 1 } }} />
                  <Typography
                    variant="body1"
                    sx={{
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    {user.username}
                  </Typography>
                  <ArrowDropDownIcon sx={{ display: { xs: 'none', sm: 'block' } }} />
                </Box>
                <Menu
                  id="user-menu"
                  anchorEl={userMenuAnchorEl}
                  open={userMenuOpen}
                  onClose={handleUserMenuClose}
                  MenuListProps={{
                    'aria-labelledby': 'user-button',
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={navigateToDashboard}>
                    <DashboardIcon sx={{ mr: 1 }} />
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={navigateToSettings}>
                    <SettingsIcon sx={{ mr: 1 }} />
                    Settings
                  </MenuItem>
                  {user.isAdmin && (
                    <MenuItem onClick={navigateToAdmin}>
                      <AdminPanelSettingsIcon sx={{ mr: 1 }} />
                      Admin Area
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
            <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content with side menu and content area */}
      <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px', height: 'calc(100vh - 64px)' }}>
        {/* Side Navigation */}
        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        >
          {/* Mobile drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                backgroundColor: theme.palette.background.default
              },
            }}
          >
            <Toolbar sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                height: 'calc(100vh - 64px)',
                top: '64px',
                backgroundColor: theme.palette.background.default,
                borderRight: `1px solid ${theme.palette.divider}`
              },
            }}
            open
          >
            {menuContent}
          </Drawer>
        </Box>

        {/* Main content area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
