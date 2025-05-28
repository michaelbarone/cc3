"use client";

import UserTileComponent from "@/app/components/login/UserTile";
import { FirstRunResponse, UserTile } from "@/app/types/auth";
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
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <div>
          <h2>Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              background: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // First run experience
  if (isFirstRun) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <div style={{ maxWidth: "500px", textAlign: "center", padding: "20px" }}>
          <h1>Welcome to ControlCenter</h1>
          <p>
            This appears to be your first time running the application. Let's set up your admin
            account.
          </p>

          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <button
              onClick={handleFirstRunLogin}
              style={{
                padding: "12px 24px",
                background: "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Set Up Admin Account
            </button>

            <button
              disabled
              title="This feature will be available in a future update"
              style={{
                padding: "12px 24px",
                background: "#f0f0f0",
                color: "#888",
                border: "none",
                borderRadius: "4px",
                cursor: "not-allowed",
                fontSize: "16px",
              }}
            >
              Restore System from Backup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular login with user tiles
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#f9f9f9",
      }}
      onClick={handleBackgroundClick}
    >
      <h1 style={{ marginBottom: "32px" }}>Select User</h1>

      {userTiles.length === 0 ? (
        <p>No users found. Please contact an administrator.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "16px",
            maxWidth: "800px",
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
        </div>
      )}
    </div>
  );
}
