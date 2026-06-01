import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

export function middleware(request) {
  const { pathname } = new URL(request.url);
  const host = request.headers.get('host') || '';

  // Bypass static assets and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Subdomain - /start redirects back to home
  if (host.endsWith(`.${APP_DOMAIN}`) && (pathname === '/start' || pathname.startsWith('/start?'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Tenant header for subdomains (used by pages to resolve which community to show)
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
  }

  // Middleware does NOT make any Supabase auth calls and does NOT touch auth
  // cookies. The browser client owns the session entirely. This keeps page
  // loads from ever hitting the auth server.
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
