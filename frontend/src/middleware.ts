import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/upload', '/display', '/api/auth', '/about', '/features', '/pricing', '/faq', '/blog', '/contact', '/cms-api'];

function isPublic(pathname: string) {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, and Next internals
  if (isPublic(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/uploads')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('mosaic_jwt')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode JWT payload (without verifying — verification happens on backend)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Protect superadmin routes from regular admins
    if (pathname.startsWith('/superadmin') && payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|cms-api|_next/static|_next/image|favicon.ico|uploads).*)'],
};
