import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, UserRole } from '@/lib/token';

const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/invite'];

const adminOnlyPaths = [
  '/',
  '/messages',
  '/reports',
  '/clients',
  '/events',
  '/cards',
  '/guests',
  '/checkin',
  '/staff',
];

function isAdminOnlyRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return adminOnlyPaths
    .filter((path) => path !== '/')
    .some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    if (pathname === '/login') {
      const token = request.cookies.get('auth_token')?.value;
      const decoded = token ? verifyToken(token) : null;
      if (decoded) {
        const redirectPath =
          decoded.role === 'check-in-staff' ? '/check-in-staff' : '/';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const decoded = token ? verifyToken(token) : null;

  if (!decoded) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role: UserRole = decoded.role;

  if (role === 'check-in-staff') {
    if (pathname.startsWith('/api/')) {
      const allowedStaffApi =
        pathname.startsWith('/api/staff/') || pathname === '/api/auth/me';
      if (!allowedStaffApi) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    if (pathname === '/check-in-staff' || pathname.startsWith('/check-in-staff/')) {
      return NextResponse.next();
    }

    if (isAdminOnlyRoute(pathname)) {
      return NextResponse.redirect(new URL('/check-in-staff', request.url));
    }
  }

  if (role === 'admin' && pathname.startsWith('/check-in-staff')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
