// Types for authentication and authorization

export interface UserTile {
  id: string;
  username: string;
  avatarUrl: string | null;
  requiresPassword: boolean;
  isAdmin: boolean;
  lastLoginAt?: string;
}

export interface FirstRunResponse {
  isFirstRun: boolean;
  error?: string;
}

// Session types extending NextAuth
declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    role: string;
    isActive: boolean;
    theme: string;
    menuPosition: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      role: string;
      isActive: boolean;
      theme: string;
      menuPosition: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isActive: boolean;
    theme: string;
    menuPosition: string;
  }
}
