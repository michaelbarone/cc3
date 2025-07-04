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
  "/api/public",
];

// Paths that require admin access
const adminPaths = ["/admin"]; // Protects all routes under /admin/*

// Add interface before the middleware function
interface JWTPayload {
  isAdmin: boolean;
  [key: string]: boolean | string | number | undefined; // Standard JWT claim types
}

// Add a function to check for static asset paths
const isStaticAssetPath = (pathname: string) => {
  return (
    pathname.startsWith("/logos/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/avatars/") ||
    pathname.startsWith("/favicons/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/site.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon-32x32.png" ||
    pathname === "/favicon-16x16.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon-default.png" ||
    pathname === "/android-chrome-192x192.png" ||
    pathname === "/android-chrome-512x512.png" ||
    pathname === "/startup-image-320x460.png" ||
    pathname === "/icon-lowrez-58.png"
  );
};

export function middleware(request: NextRequest): Promise<NextResponse> | NextResponse {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Allow access to all /api/public/* paths
  if (pathname.startsWith("/api/public/")) {
    return NextResponse.next();
  }

  // Skip middleware for public paths
  // Also, allow GET requests to /api/admin/app-config without auth for the login page
  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth/")) ||
    (pathname === "/api/admin/app-config" && method === "GET") ||
    isStaticAssetPath(pathname)
  ) {
    // add check for public folder direct paths like /logos and /favicons and /icons and /avatars and /uploads and convert them to the /api/public/ path
    if (
      pathname.startsWith("/public/") ||
      pathname.startsWith("/logos/") ||
      pathname.startsWith("/favicons/") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/avatars/") ||
      pathname.startsWith("/uploads/")
    ) {
      return NextResponse.redirect(new URL("/api/public" + pathname, request.url));
    }

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
