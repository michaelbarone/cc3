"use client";

import UserTileComponent from "@/app/components/login/UserTile";
import { FirstRunResponse, UserTile } from "@/app/types/auth";
import { Box, Button, CircularProgress, Container, Paper, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function LoginPage() {
  const [userTiles, setUserTiles] = useState<UserTile[]>([]);
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user tiles and check for first run state
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch user tiles
        const tilesResponse = await fetch("/api/auth/user-tiles");
        if (!tilesResponse.ok) {
          throw new Error("Failed to fetch user tiles");
        }
        const tiles = await tilesResponse.json();
        setUserTiles(tiles);

        // Check if this is the first run
        const firstRunResponse = await fetch("/api/auth/first-run");
        if (!firstRunResponse.ok) {
          throw new Error("Failed to check first run state");
        }
        const { isFirstRun } = (await firstRunResponse.json()) as FirstRunResponse;
        setIsFirstRun(isFirstRun);
      } catch (err) {
        console.error("Error loading login page:", err);
        setError("Failed to load user profiles. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle login success
  const handleLoginSuccess = () => {
    router.push("/dashboard");
  };

  // Handle first run login (passwordless admin login)
  const handleFirstRunLogin = async () => {
    try {
      // Find the admin user
      const adminTile = userTiles.find((tile) => tile.isAdmin);
      if (!adminTile) {
        setError("Admin user not found");
        return;
      }

      // Get admin username
      const userResponse = await fetch(`/api/user/${adminTile.id}`);
      if (!userResponse.ok) {
        throw new Error("Failed to get admin information");
      }
      const userData = await userResponse.json();

      // Sign in admin without password - using name from userData
      const result = await fetch("/api/auth/first-run/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: userData.name }),
      });

      if (!result.ok) {
        const errorData = await result.json();
        console.error("First run login failed:", errorData);
        throw new Error(`Failed to sign in admin user: ${errorData.error || result.status}`);
      }

      // Redirect to set admin password page
      router.push("/first-run/set-admin-password");
    } catch (err) {
      console.error("First run login error:", err);
      setError("Failed to start first run setup");
    }
  };

  // Handle clicking outside any tile
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Check if the click was directly on the background, not a child element
    if (e.target === e.currentTarget) {
      setSelectedTileId(null);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Paper elevation={3} sx={{ p: 3, maxWidth: 400 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Error
          </Typography>
          <Typography paragraph>{error}</Typography>
          <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Paper>
      </Box>
    );
  }

  // First run experience
  if (isFirstRun) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: "center" }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to ControlCenter
          </Typography>
          <Typography paragraph>
            This appears to be your first time running the application. Let's set up your admin
            account.
          </Typography>

          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Button variant="contained" color="primary" size="large" onClick={handleFirstRunLogin}>
              Set Up Admin Account
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              size="large"
              disabled
              title="This feature will be available in a future update"
            >
              Restore System from Backup
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Regular login with user tiles
  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
      }}
      onClick={handleBackgroundClick}
    >
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Select User
      </Typography>

      {userTiles.length === 0 ? (
        <Typography>No users found. Please contact an administrator.</Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 2,
            maxWidth: 800,
          }}
        >
          {userTiles.map((tile) => (
            <UserTileComponent
              key={tile.id}
              tile={tile}
              onLoginSuccess={handleLoginSuccess}
              isSelected={selectedTileId === tile.id}
              onSelect={() => setSelectedTileId(tile.id)}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
