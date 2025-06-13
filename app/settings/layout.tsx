"use client";

import AppLayout from "@/app/components/layout/AppLayout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BrushIcon from "@mui/icons-material/Brush";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LockIcon from "@mui/icons-material/Lock";
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    {
      title: "Profile",
      icon: <AccountCircleIcon />,
      path: "/settings/profile",
    },
    {
      title: "Password",
      icon: <LockIcon />,
      path: "/settings/password",
    },
    {
      title: "Appearance",
      icon: <BrushIcon />,
      path: "/settings/appearance",
    },
    // Add more settings pages here as the app grows
  ];

  // During SSR and initial mount, render a simpler version
  if (!mounted) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          borderRight: `1px solid ${theme.palette.divider}`,
          borderRadius: 0,
          overflow: "auto",
        }}
      >
        <Typography variant="h6" sx={{ p: 2, fontWeight: 500 }}>
          User Settings
        </Typography>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.title} disablePadding>
              <ListItemButton>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        borderRight: `1px solid ${theme.palette.divider}`,
        borderRadius: 0,
        overflow: "auto",
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
              onClick={() => router.replace(item.path)}
              sx={{
                "&.Mui-selected": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.04)",
                },
                "&.Mui-selected:hover": {
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)",
                },
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
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Add header content with dashboard button
  const headerContent = (
    <Button
      color="inherit"
      startIcon={<DashboardIcon />}
      onClick={() => router.replace("/dashboard")}
      sx={{ mr: 1 }}
    >
      Dashboard
    </Button>
  );

  // During SSR and initial mount, render a simpler version
  if (!mounted) {
    return (
      <AppLayout
        menuContent={<SettingsSidebar />}
        forceMenuPosition="side"
        headerContent={headerContent}
      >
        <Box
          sx={{
            display: "flex",
            height: "100%",
            overflow: "hidden",
            position: "relative",
            zIndex: 1100,
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              p: 3,
              height: "100%",
              overflow: "auto",
              position: "relative",
              zIndex: 1100,
            }}
          />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      menuContent={<SettingsSidebar />}
      forceMenuPosition="side"
      headerContent={headerContent}
    >
      <Box
        sx={{
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          zIndex: 1100,
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 64, // AppBar height
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "background.default",
            zIndex: 1050,
          }}
        />
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            height: "100%",
            overflow: "auto",
            position: "relative",
            zIndex: 1100,
          }}
        >
          {children}
        </Box>
      </Box>
    </AppLayout>
  );
}
