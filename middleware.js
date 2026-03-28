import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

export function middleware(request) {
  const { pathname } = new URL(request.url);
  const host = request.headers.get('host') || '';

  // Bypass static assets and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Subdomain - strip /start redirect back to home, set tenant header
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
    if (pathname === '/start' || pathname.startsWith('/start?')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
    return response;
  }

  // Everything else - pass through (page.js handles root domain redirect)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
