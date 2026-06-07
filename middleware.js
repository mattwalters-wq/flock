import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

export function middleware(request) {
  const { pathname } = new URL(request.url);
  const host = request.headers.get('host') || '';

  // Bypass static assets and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const isApex = host === APP_DOMAIN || host === `www.${APP_DOMAIN}`;
  const isTenant = host.endsWith(`.${APP_DOMAIN}`) && !isApex;

  // Apex: the marketing homepage lives at /start; forward the bare root to it.
  if (isApex && pathname === '/') {
    return NextResponse.redirect(new URL('/start', request.url));
  }

  // Tenant subdomains: the marketing homepage and onboarding don't belong here.
  if (isTenant && (
    pathname === '/start' || pathname.startsWith('/start?') ||
    pathname === '/onboarding' || pathname.startsWith('/onboarding?')
  )) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Tenant header for subdomains (used by pages to resolve which community to show)
  if (isTenant) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
  }

  // Middleware does NOT make any Supabase auth calls and does NOT touch auth
  // cookies. The browser client owns the session entirely.
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
