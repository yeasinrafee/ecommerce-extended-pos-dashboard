import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/favicon.ico'];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get('accessToken')?.value;

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    if (pathname === '/' && token) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
