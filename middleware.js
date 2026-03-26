import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
const DEV_TENANT_SLUG = process.env.DEV_TENANT_SLUG || 'the-stamps';

export function middleware(request) {
  const { pathname } = new URL(request.url);
  const host = request.headers.get('host') || '';

  // Bypass static assets and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Root domain - redirect to marketing page
  if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(new URL('/start', request.url));
    }
    return NextResponse.next();
  }

  // Localhost dev
  if (host.startsWith('localhost')) {
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', DEV_TENANT_SLUG);
    return response;
  }

  // Subdomain (artist.fans-flock.com)
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');

    // /start is the marketing page - redirect subdomains away from it
    if (pathname === '/start' || pathname.startsWith('/start?')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
    return response;
  }

  // Custom domain
  const response = NextResponse.next();
  response.headers.set('x-tenant-slug', '__custom__');
  response.headers.set('x-host', host);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
