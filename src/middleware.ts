import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Route access rules per role
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard/case', '/dashboard/account', '/dashboard/contact', '/dashboard/settings'],
  manager: ['/dashboard/case', '/dashboard/contact'],
  submitercase: ['/dashboard/case'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const user = await verifyToken(token);
    if (!user) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('session_token');
      return response;
    }

    // Check role-based route access
    const allowedRoutes = ROLE_ROUTES[user.role] || [];
    const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

    if (!hasAccess) {
      // Redirect to their first allowed route
      const firstAllowed = allowedRoutes[0] || '/';
      return NextResponse.redirect(new URL(firstAllowed, request.url));
    }
  }

  // If already logged in and accessing login page, redirect to dashboard
  if (pathname === '/') {
    const token = request.cookies.get('session_token')?.value;
    if (token) {
      const user = await verifyToken(token);
      if (user) {
        const firstAllowed = (ROLE_ROUTES[user.role] || [])[0] || '/dashboard/case';
        return NextResponse.redirect(new URL(firstAllowed, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
