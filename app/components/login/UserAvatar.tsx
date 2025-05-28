"use client";

import Image from "next/image";
import { CSSProperties } from "react";

interface UserAvatarProps {
  username: string;
  avatarUrl: string | null;
  size: number;
  style?: CSSProperties;
}

// Function to generate a color based on username
const generateColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a pastel color (lighter and softer)
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
};

// Function to get avatar text (first letter or first letters of first 2 words)
const getAvatarText = (username: string): string => {
  if (!username) return "?";

  const words = username.split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return username[0].toUpperCase();
};

export default function UserAvatar({ username, avatarUrl, size, style }: UserAvatarProps) {
  const backgroundColor = generateColor(username);
  const avatarText = getAvatarText(username);

  if (avatarUrl) {
    return (
      <div
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          ...style,
        }}
      >
        <Image
          src={avatarUrl}
          alt={`${username}'s avatar`}
          fill
          style={{
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${size / 2.5}px`,
        fontWeight: "bold",
        color: "#333",
        ...style,
      }}
    >
      {avatarText}
    </div>
  );
}
