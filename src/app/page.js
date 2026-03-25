'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import { LandingPage } from '@/components/LandingPage';
import { FlockApp } from '@/components/FlockApp';

export default function Home() {
  const [state, setState] = useState('loading'); // loading | landing | app
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    const sb = getSupabase();
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const host = window.location.hostname;

    // Resolve tenant from subdomain client-side
    const resolveTenant = async () => {
      if (host.endsWith(`.${APP_DOMAIN}`)) {
        const slug = host.replace(`.${APP_DOMAIN}`, '');
        const { data: tenant } = await sb.from('tenants').select('id').eq('slug', slug).single();
        if (tenant?.id) {
          setTenantId(tenant.id);
          return tenant.id;
        }
      }
      return null;
    };

    const init = async () => {
      const tid = await resolveTenant();
      const { data: { session } } = await sb.auth.getSession();

      if (!session?.user) {
        setState('landing');
        return;
      }

      // Signed in - check profile exists
      if (tid) {
        const { data: profile } = await sb.from('profiles').select('id').eq('id', session.user.id).eq('tenant_id', tid).single();
        if (!profile) {
          // Create profile on first login
          const displayName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'fan';
          await sb.from('profiles').insert({
            id: session.user.id, tenant_id: tid, display_name: displayName,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
          }).catch(() => {});
        }
      }

      setState('app');
    };

    init();

    // Listen for auth changes (magic link landing)
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setState('app');
      } else if (event === 'SIGNED_OUT') {
        setState('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: 'var(--ruby)' }}>✦</div>
    </div>
  );

  if (state === 'landing') return <LandingPage />;
  return <FlockApp />;
}
