'use client';

import { ReactNode } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText,
  ListItemButton, Divider, useTheme } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AppLayout from '@/app/components/layout/AppLayout';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BrushIcon from '@mui/icons-material/Brush';

interface SettingsLayoutProps {
  children: ReactNode;
}

function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  const menuItems = [
    {
      title: 'Profile',
      icon: <AccountCircleIcon />,
      path: '/settings/profile'
    },
    {
      title: 'Password',
      icon: <LockIcon />,
      path: '/settings/password'
    },
    {
      title: 'Appearance',
      icon: <BrushIcon />,
      path: '/settings/appearance'
    }
    // Add more settings pages here as the app grows
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        borderRight: `1px solid ${theme.palette.divider}`,
        borderRadius: 0,
        overflow: 'auto'
      }}
    >
      <Typography variant="h6" sx={{ p: 2, fontWeight: 500 }}>
        User Settings
      </Typography>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.title} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => router.push(item.path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)',
                },
                '&.Mui-selected:hover': {
                  bgcolor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <AppLayout menuContent={<SettingsSidebar />} forceMenuPosition="side">
      <Box
        sx={{
          display: 'flex',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            height: '100%',
            overflow: 'auto'
          }}
        >
          {children}
        </Box>
      </Box>
    </AppLayout>
  );
}
