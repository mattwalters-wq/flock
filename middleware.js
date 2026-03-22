import { NextResponse } from 'next/server';

const BYPASS_PATHS = ['/_next/', '/favicon.ico', '/api/auth', '/start', '/og-image'];
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
const DEV_TENANT_SLUG = process.env.DEV_TENANT_SLUG || 'the-stamps';

export function middleware(request) {
  const { pathname, host } = new URL(request.url);

  // Bypass for static assets and certain routes
  if (BYPASS_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let tenantSlug = null;

  if (host === 'localhost:3000' || host.startsWith('localhost:')) {
    tenantSlug = DEV_TENANT_SLUG;
  } else if (host.endsWith(`.${APP_DOMAIN}`)) {
    tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
  } else if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
    // Root domain - redirect to /start unless already going there
    if (!pathname.startsWith('/start')) {
      return NextResponse.redirect(new URL('/start', request.url));
    }
    return NextResponse.next();
  } else {
    // Custom domain - will be resolved by the page via DB lookup
    tenantSlug = '__custom__';
  }

  if (!tenantSlug) {
    return NextResponse.redirect(new URL(`https://${APP_DOMAIN}/start`));
  }

  const response = NextResponse.next();
  response.headers.set('x-tenant-slug', tenantSlug);
  response.headers.set('x-host', host);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
