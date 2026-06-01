import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
const COOKIE_DOMAIN = `.${APP_DOMAIN}`;

export async function middleware(request) {
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

  const response = NextResponse.next({ request });

  // Tenant header for subdomains
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const tenantSlug = host.replace(`.${APP_DOMAIN}`, '');
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-host', host);
  }

  // Session cookie handling - only on our real domain (skip localhost / vercel previews)
  const onAppDomain = host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`);
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  if (onAppDomain && hasAuthCookie) {
    // Migrate any existing host-only auth cookies up to the apex domain so the
    // session is shared across every tenant subdomain. Done first so a token
    // refresh below (setAll) can overwrite with fresh values if needed.
    request.cookies.getAll().forEach(c => {
      if (c.name.startsWith('sb-') && c.name.includes('-auth-token')) {
        response.cookies.set(c.name, c.value, { domain: COOKIE_DOMAIN, path: '/', secure: true, sameSite: 'lax' });
      }
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, { ...options, domain: COOKIE_DOMAIN, path: '/', secure: true, sameSite: 'lax' });
            });
          },
        },
      }
    );

    // Touch the session - refreshes the token if needed and re-emits cookies
    // with the apex domain via setAll above.
    try { await supabase.auth.getUser(); } catch (e) { /* non-fatal */ }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
