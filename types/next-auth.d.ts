/**
 * Type declarations for NextAuth.js
 * Extends the default types with our custom properties
 */
import "next-auth";
import "next-auth/jwt";

// Define our custom properties
interface IUser {
  id: string;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  theme: string;
  menuPosition: string;
  passwordHash?: string;
  avatarUrl?: string | null;
}

// Extend the built-in session types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      role: string;
      isAdmin: boolean;
      isActive: boolean;
      theme: string;
      menuPosition: string;
      passwordHash?: string;
      avatarUrl?: string | null;
    };
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    id: string;
    name?: string | null;
    role: string;
    isAdmin: boolean;
    isActive: boolean;
    theme: string;
    menuPosition: string;
    passwordHash?: string;
    avatarUrl?: string | null;
  }
}

// Extend the JWT types
declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, when using JWT sessions
   */
  interface JWT {
    id: string;
    role: string;
    isAdmin: boolean;
    isActive: boolean;
    theme: string;
    menuPosition: string;
    passwordHash?: string;
    avatarUrl?: string | null;
  }
}
