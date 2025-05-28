"use client";

import { UserTile as UserTileType } from "@/app/types/auth";
import { signIn } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import UserTilePassword from "./UserTilePassword";

interface UserTileProps {
  tile: UserTileType;
  onLoginSuccess: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export default function UserTile({ tile, onLoginSuccess, isSelected, onSelect }: UserTileProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  // When selected, automatically show password field
  useEffect(() => {
    if (!isSelected) {
      // Reset error when deselected
      setError("");
    }
  }, [isSelected]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // If not already selected, select this tile
      if (!isSelected) {
        onSelect();
      }
    },
    [isSelected, onSelect],
  );

  // Handle passwordless login
  const handlePasswordlessLogin = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling

    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setError("");

    try {
      // Get the username from server using userId
      const userResponse = await fetch(`/api/user/${tile.id}`);
      if (!userResponse.ok) {
        throw new Error("Failed to get user information");
      }

      const userData = await userResponse.json();

      // For no-password user, try to sign in (this should only work for first-run)
      const result = await signIn("credentials", {
        redirect: false,
        username: userData.name,
        // No password provided
      });

      if (result?.error) {
        console.error("Passwordless login failed:", result.error);
        setError("Login failed. User might require a password.");
      } else if (result?.ok) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      className={`user-tile ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "16px",
        margin: "8px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: isSelected ? "0 4px 12px rgba(0, 0, 0, 0.1)" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "180px",
        height: "180px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          transition: "transform 0.3s ease",
          transform: isSelected ? "translateY(-70px)" : "translateY(0)",
        }}
      >
        <UserAvatar
          username={tile.username}
          avatarUrl={tile.avatarUrl}
          size={64}
          style={{
            opacity: isSelected ? 0 : 1,
            transition: "opacity 0.3s ease",
            marginBottom: "12px",
          }}
        />

        <div
          style={{
            textAlign: "center",
            fontWeight: tile.isAdmin ? "bold" : "normal",
            marginTop: isSelected ? "-20px" : "0",
            transition: "margin-top 0.3s ease",
          }}
        >
          {tile.username}
          {tile.isAdmin && (
            <span
              style={{
                fontSize: "0.7rem",
                background: "#f0f0f0",
                padding: "2px 6px",
                borderRadius: "10px",
                marginLeft: "5px",
              }}
            >
              Admin
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            color: "red",
            fontSize: "0.8rem",
            marginTop: "8px",
            textAlign: "center",
            position: "absolute",
            bottom: "8px",
            width: "90%",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "60px",
          width: "90%",
          opacity: isSelected ? 1 : 0,
          transform: isSelected ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          pointerEvents: isSelected ? "auto" : "none",
        }}
      >
        {isSelected && tile.requiresPassword && (
          <UserTilePassword userId={tile.id} onLoginSuccess={onLoginSuccess} />
        )}

        {isSelected && !tile.requiresPassword && (
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button
              onClick={handlePasswordlessLogin}
              disabled={isLoggingIn}
              style={{
                padding: "8px 16px",
                background: "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                opacity: isLoggingIn ? 0.7 : 1,
              }}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
