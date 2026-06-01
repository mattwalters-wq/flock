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

  // Tenant header for subdomains
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
  }

  // NOTE: Middleware does NOT touch auth cookies. The browser client
  // (src/lib/supabase-browser.js) is the single owner of the Supabase auth
  // cookie and sets the apex domain (.fans-flock.com) itself. Having middleware
  // also rewrite the cookie on every response desyncs the chunked auth token and
  // causes the client to refresh in a tight loop. Leave auth cookies alone here.

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
