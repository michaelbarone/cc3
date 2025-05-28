"use client";

import { signIn } from "next-auth/react";
import React, { useState } from "react";

interface UserTilePasswordProps {
  userId: string;
  onLoginSuccess: () => void;
}

export default function UserTilePassword({ userId, onLoginSuccess }: UserTilePasswordProps) {
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent click from bubbling to parent

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsLoggingIn(true);
    setError("");

    try {
      // Get the username from server using userId
      const userResponse = await fetch(`/api/user/${userId}`);
      if (!userResponse.ok) {
        throw new Error("Failed to get user information");
      }

      const userData = await userResponse.json();

      // Sign in with NextAuth
      const result = await signIn("credentials", {
        redirect: false,
        username: userData.username,
        password: password,
        rememberMe: rememberMe,
      });

      if (result?.error) {
        setError("Invalid password");
      } else if (result?.ok) {
        onLoginSuccess();
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error("Login error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: "16px",
        width: "100%",
      }}
    >
      {error && (
        <div style={{ color: "red", fontSize: "0.8rem", marginBottom: "8px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          disabled={isLoggingIn}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "12px",
          fontSize: "0.8rem",
        }}
      >
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isLoggingIn}
          style={{ marginRight: "4px" }}
        />
        <label htmlFor="rememberMe">Remember me</label>
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          cursor: isLoggingIn ? "not-allowed" : "pointer",
          opacity: isLoggingIn ? 0.7 : 1,
        }}
      >
        {isLoggingIn ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
