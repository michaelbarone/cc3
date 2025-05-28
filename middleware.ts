import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Define which routes should be protected
const protectedPaths = ["/dashboard", "/admin", "/settings"];
const authRoutes = ["/login", "/api/auth"];
const publicRoutes = ["/api/auth/user-tiles", "/api/auth/first-run"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is a protected route
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthRoute = authRoutes.some((path) => pathname.startsWith(path));
  const isPublicRoute = publicRoutes.some((path) => pathname === path);
  const isAdminRoute = pathname.startsWith("/admin");

  // Allow access to auth routes and public routes without authentication
  if (isAuthRoute || isPublicRoute) {
    return NextResponse.next();
  }

  // Only check authentication for protected routes
  if (isProtectedPath) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no token or user is not active, redirect to login
    if (!token || token.isActive !== true) {
      const loginUrl = new URL("/login", request.url);
      // Add the current path as a redirect parameter
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Additional check for admin routes
    if (isAdminRoute && token.role !== "ADMIN") {
      // Redirect non-admin users to dashboard with not authorized message
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "NotAuthorized");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
