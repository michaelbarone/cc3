"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { cleanupIframes } from "../utils/iframe-utils";

// Define user type
export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  lastActiveUrl?: string;
  hasPassword?: boolean;
  avatarUrl?: string;
  menuPosition?: "side" | "top";
  themeMode?: "light" | "dark";
}

// Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (
    username: string,
    password?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  updateUser: (updatedUser: User) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Login function
  const login = async (username: string, password?: string): Promise<User> => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Login failed");
      }

      const data = await response.json();

      // Check if we have the expected response structure
      if (!data.success || !data.user) {
        throw new Error("Invalid response from server");
      }

      // Set the user state from the user property
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Clean up iframes before clearing user state
      cleanupIframes();

      // Clear user state
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Register function
  const register = async (username: string, password?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.error };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "An error occurred during registration" };
    }
  };

  // Update user function
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
