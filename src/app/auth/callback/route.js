import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const host = request.headers.get('host') || '';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // If we're on the root domain, find the user's community and redirect there
    if (data?.user && (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`)) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('tenant_id, tenants(slug)')
        .eq('id', data.user.id)
        .limit(1);
      const slug = profiles?.[0]?.tenants?.slug;
      if (slug) {
        return NextResponse.redirect(`https://${slug}.${APP_DOMAIN}`);
      }
      return NextResponse.redirect(`https://${APP_DOMAIN}/start`);
    }
  }

  // On a subdomain - redirect to root of that subdomain
  return NextResponse.redirect(origin);
}
