"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface SessionProviderProps {
  children: ReactNode;
}

// Session checker component that verifies the user session
function SessionChecker() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Only check protected routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings");

  useEffect(() => {
    // Only validate on protected routes and when session is loaded
    if (isProtectedRoute && status !== "loading") {
      if (!session) {
        // No session, redirect to login
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      } else if (!session.user.isActive) {
        // User is not active, sign out and redirect to login
        router.push(`/login?error=InactiveUser`);
      }
    }
  }, [session, status, router, pathname, isProtectedRoute]);

  return null;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionChecker />
      {children}
    </NextAuthSessionProvider>
  );
}
