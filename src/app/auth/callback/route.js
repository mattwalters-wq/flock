import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { tenantSessionUrl } from '@/lib/tenant-session-url';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

// OAuth (PKCE) callback. The code verifier was stored in a cookie by the
// browser client when sign-in started, so the exchange must run with a
// cookie-aware client; the resulting session is written back to the same
// cookies, where the browser client picks it up.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const host = request.headers.get('host') || '';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      },
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error('[auth/callback] exchange failed:', error.message);

    // If we're on the root domain, find the user's community and redirect there
    if (data?.user && (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`)) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('tenant_id, tenants(slug)')
        .eq('id', data.user.id)
        .limit(1);
      const slug = profiles?.[0]?.tenants?.slug;
      if (slug) {
        const destination = tenantSessionUrl(slug, data.session);
        if (destination) return NextResponse.redirect(destination);
      }
      return NextResponse.redirect(`https://${APP_DOMAIN}/onboarding`);
    }
  }

  // On a subdomain - redirect to root of that subdomain
  return NextResponse.redirect(origin);
}
