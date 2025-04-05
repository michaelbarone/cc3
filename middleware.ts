import { NextRequest, NextResponse } from "next/server";

// Paths that should be accessible to the public
const publicPaths = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/users",
  "/api/auth/first-run",
  "/api/admin/app-config", // Allow public read-only access for login page
  "/api/health",
];

// Paths that require admin access
const adminPaths = ["/admin"]; // Protects all routes under /admin/*

// Add interface before the middleware function
interface JWTPayload {
  isAdmin: boolean;
  [key: string]: boolean | string | number | undefined; // Standard JWT claim types
}

export function middleware(request: NextRequest): Promise<NextResponse> | NextResponse {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip middleware for public paths
  // Also, allow GET requests to /api/admin/app-config without auth for the login page
  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth/")) ||
    (pathname === "/api/admin/app-config" && method === "GET")
  ) {
    return NextResponse.next();
  }

  // Check for authentication cookie
  const authCookie = request.cookies.get("auth_token");

  // If no auth token, redirect to login
  if (!authCookie) {
    const loginUrl = new URL("/login", request.url);
    // Add the current path as a redirect parameter
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin paths, check admin status from JWT payload
  if (
    adminPaths.some((path) => pathname.startsWith(path)) ||
    (pathname.startsWith("/api/admin") &&
      !(pathname === "/api/admin/app-config" && method === "GET"))
  ) {
    try {
      // Using weak JWT verification just for the middleware
      // Full verification happens in the route handlers
      const payload = JSON.parse(
        Buffer.from(authCookie.value.split(".")[1], "base64").toString(),
      ) as JWTPayload;

      // If not admin, redirect to home page
      if (!payload.isAdmin) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // If JWT parsing fails, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
