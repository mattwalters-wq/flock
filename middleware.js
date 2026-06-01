import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
const COOKIE_DOMAIN = `.${APP_DOMAIN}`;

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

  // Cross-subdomain session: re-scope any host-only Supabase auth cookies up to
  // the apex domain so one login is shared across every tenant subdomain.
  // This is a purely local cookie rewrite - it makes NO calls to the auth server,
  // so it does not affect rate limits. The client SDK still handles token refresh.
  const onAppDomain = host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`);
  if (onAppDomain) {
    request.cookies.getAll().forEach(c => {
      if (c.name.startsWith('sb-') && c.name.includes('-auth-token')) {
        response.cookies.set(c.name, c.value, { domain: COOKIE_DOMAIN, path: '/', secure: true, sameSite: 'lax' });
      }
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
