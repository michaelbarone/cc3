"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { PasswordPolicy } from "@/app/lib/auth/password-validation";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

export default function PasswordSettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(!!user?.hasPassword);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    minPasswordLength: 4,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  });

  // Fetch password policy
  useEffect(() => {
    const fetchPasswordPolicy = async () => {
      try {
        const response = await fetch("/api/admin/app-config/password-policy");
        if (response.ok) {
          const policy = await response.json();
          setPasswordPolicy(policy);
        }
      } catch (error) {
        console.error("Error fetching password policy:", error);
      }
    };

    fetchPasswordPolicy();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setValidationErrors([]);

    if (passwordEnabled && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/settings/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: passwordEnabled ? newPassword : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message || "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        } else {
          setMessage({ type: "error", text: data.message || "Failed to update password." });
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
      console.error("Error updating password:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordEnabled(event.target.checked);
    if (!event.target.checked) {
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Generate password requirements text
  const getPasswordRequirementsText = () => {
    const requirements = [
      `Password must be at least ${passwordPolicy.minPasswordLength} characters`,
    ];
    if (passwordPolicy.requireUppercase) requirements.push("include uppercase letters");
    if (passwordPolicy.requireLowercase) requirements.push("include lowercase letters");
    if (passwordPolicy.requireNumbers) requirements.push("include numbers");
    if (passwordPolicy.requireSpecialChars) requirements.push("include special characters");

    return requirements.join(", ");
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Password Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your account password. You can enable or disable password protection for your
        account.
      </Typography>

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2, maxWidth: 600 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Password does not meet requirements:</Typography>
            <ul style={{ marginTop: 0, paddingLeft: "1.5rem" }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch checked={passwordEnabled} onChange={handleTogglePassword} color="primary" />
              }
              label="Enable password protection"
            />

            <Divider />

            {user?.hasPassword && (
              <TextField
                label="Current Password"
                type="password"
                variant="outlined"
                fullWidth
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!!user?.hasPassword}
                disabled={loading}
              />
            )}

            {passwordEnabled && (
              <>
                <TextField
                  label="New Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required={passwordEnabled}
                  disabled={loading}
                  helperText={getPasswordRequirementsText()}
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={passwordEnabled}
                  disabled={loading}
                />
              </>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
