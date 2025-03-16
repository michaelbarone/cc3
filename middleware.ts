import { NextRequest, NextResponse } from 'next/server';

// Paths that should be accessible to the public
const publicPaths = ['/', '/login', '/api/auth/login', '/api/auth/register'];

// Paths that require admin access
const adminPaths = ['/admin', '/admin/users', '/admin/url-groups'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith('/api/auth/'))) {
    return NextResponse.next();
  }

  // Check for authentication cookie
  const authCookie = request.cookies.get('auth_token');

  // If no auth token, redirect to login
  if (!authCookie) {
    const loginUrl = new URL('/login', request.url);
    // Add the current path as a redirect parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin paths, check admin status from JWT payload
  if (adminPaths.some(path => pathname.startsWith(path))) {
    try {
      // Using weak JWT verification just for the middleware
      // Full verification happens in the route handlers
      const payload = JSON.parse(
        Buffer.from(authCookie.value.split('.')[1], 'base64').toString()
      );

      // If not admin, redirect to home page
      if (!payload.isAdmin) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // If JWT parsing fails, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
