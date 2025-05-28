"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function SetAdminPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/first-run/set-admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, confirmPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set password");
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div
      style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
    >
      <div style={{ maxWidth: "400px", width: "100%", padding: "20px" }}>
        <h1>Set Admin Password</h1>
        <p>Please set a password for the admin account to complete the first-run setup.</p>

        {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label htmlFor="password" style={{ display: "block", marginBottom: "5px" }}>
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
              minLength={4}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "5px" }}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
              minLength={4}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "10px 15px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Setting Password..." : "Set Password"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              style={{
                padding: "10px 15px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              Cancel Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
