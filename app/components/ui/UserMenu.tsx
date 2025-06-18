"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { ThemeContext } from "@/app/theme/theme-provider";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { Avatar, Box, Divider, Menu, MenuItem, Typography, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import React, { useContext, useState } from "react";

interface UserMenuProps {
  showAdminOption?: boolean;
}

export default function UserMenu({ showAdminOption = false }: UserMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const colorMode = useContext(ThemeContext);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const navigateTo = (path: string) => {
    handleMenuClose();
    router.replace(path);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          mr: 2,
        }}
        onClick={handleMenuClick}
        aria-controls={anchorEl ? "user-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={anchorEl ? "true" : undefined}
      >
        {user.avatarUrl ? (
          <Avatar
            src={user.avatarUrl}
            alt={user.username}
            sx={{
              width: 32,
              height: 32,
              mr: { xs: 0, sm: 1 },
            }}
          />
        ) : (
          <AccountCircleIcon sx={{ mr: { xs: 0, sm: 1 } }} />
        )}
        <Typography
          variant="body1"
          sx={{
            display: { xs: "none", sm: "block" },
          }}
        >
          {user.username}
        </Typography>
        <ArrowDropDownIcon sx={{ display: { xs: "none", sm: "block" } }} />
      </Box>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "user-button",
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={() => navigateTo("/settings")}>
          <SettingsIcon sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        {showAdminOption && user.isAdmin && (
          <MenuItem onClick={() => navigateTo("/admin")}>
            <AdminPanelSettingsIcon sx={{ mr: 1 }} />
            Admin Area
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? (
            <Brightness7Icon sx={{ mr: 1 }} />
          ) : (
            <Brightness4Icon sx={{ mr: 1 }} />
          )}
          {theme.palette.mode === "dark" ? "Light Mode" : "Dark Mode"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
