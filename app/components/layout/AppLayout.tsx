'use client';

import { useState, ReactNode } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Drawer, useTheme, Menu, MenuItem, Divider } from '@mui/material';
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

const DRAWER_WIDTH = 240;

interface AppLayoutProps {
  children: ReactNode;
  menuContent: ReactNode;
}

export default function AppLayout({ children, menuContent }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const colorMode = useContext(ThemeContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);

  const userMenuOpen = Boolean(userMenuAnchorEl);

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
    router.push('/login');
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

  // For debugging
  console.log('User data:', user);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Control Center
          </Typography>
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
                <AccountCircleIcon sx={{ mr: 1 }} />
                <Typography variant="body1">{user.username}</Typography>
                <ArrowDropDownIcon />
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
        </Toolbar>
      </AppBar>

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
              backgroundColor: theme.palette.background.default,
              borderRight: `1px solid ${theme.palette.divider}`
            },
          }}
          open
        >
          <Toolbar />
          {menuContent}
        </Drawer>
      </Box>

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Toolbar /> {/* This creates space for the AppBar */}
        {children}
      </Box>
    </Box>
  );
}
