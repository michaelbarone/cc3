"use client";

import { UserTile as UserTileType } from "@/app/types/auth";
import { useCallback, useState } from "react";
import UserAvatar from "./UserAvatar";
import UserTilePassword from "./UserTilePassword";

interface UserTileProps {
  tile: UserTileType;
  onLoginSuccess: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export default function UserTile({ tile, onLoginSuccess, isSelected, onSelect }: UserTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(() => {
    if (!isSelected) {
      onSelect();
    } else if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isSelected, isExpanded, onSelect]);

  // Reset expanded state when no longer selected
  if (!isSelected && isExpanded) {
    setIsExpanded(false);
  }

  return (
    <div
      className={`user-tile ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}`}
      onClick={handleClick}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "16px",
        margin: "8px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isExpanded ? "scale(1.05)" : "scale(1)",
        boxShadow: isSelected ? "0 4px 12px rgba(0, 0, 0, 0.1)" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: isExpanded ? "250px" : "180px",
        height: isExpanded ? "auto" : "180px",
      }}
    >
      <UserAvatar username={tile.username} avatarUrl={tile.avatarUrl} size={isExpanded ? 80 : 64} />

      <div
        style={{
          marginTop: "12px",
          textAlign: "center",
          fontWeight: tile.isAdmin ? "bold" : "normal",
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

      {isExpanded && tile.requiresPassword && (
        <UserTilePassword userId={tile.id} onLoginSuccess={onLoginSuccess} />
      )}

      {isExpanded && !tile.requiresPassword && (
        <div style={{ marginTop: "16px" }}>
          <button
            onClick={onLoginSuccess}
            style={{
              padding: "8px 16px",
              background: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
}
