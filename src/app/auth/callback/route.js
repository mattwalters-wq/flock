import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const headersList = headers();
    const tenantSlug = headersList.get('x-tenant-slug');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      let tenantId = null;
      if (tenantSlug && tenantSlug !== '__custom__') {
        const { data: tenant } = await serviceSupabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single();
        tenantId = tenant?.id;
      }

      if (tenantId) {
        const { data: existing } = await serviceSupabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .eq('tenant_id', tenantId)
          .single();

        if (!existing) {
          const displayName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.display_name ||
            data.user.email?.split('@')[0] ||
            'fan';

          await serviceSupabase.from('profiles').insert({
            id: data.user.id,
            tenant_id: tenantId,
            display_name: displayName,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            role: 'fan',
            stamp_count: 0,
            stamp_level: 'first_press',
          });
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
