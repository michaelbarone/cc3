"use client";

import { createContext, ReactNode, useContext } from "react";

interface AuthContextType {
  user: { id: string; username: string; is_admin: boolean } | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
