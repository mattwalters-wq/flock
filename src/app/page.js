'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import { PublicPage } from '@/components/PublicPage';
import { FlockApp } from '@/components/FlockApp';

export default function Home() {
  const [state, setState] = useState('loading');
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    const sb = getSupabase();
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const host = window.location.hostname;

    const init = async () => {
      // Root domain - redirect to marketing page
      if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
        window.location.href = '/start';
        return;
      }

      let tid = null;
      if (host.endsWith(`.${APP_DOMAIN}`)) {
        const slug = host.replace(`.${APP_DOMAIN}`, '');
        const { data: tenant } = await sb.from('tenants').select('id').eq('slug', slug).single();
        tid = tenant?.id || null;
      }
      setTenantId(tid);

      // No tenant found - show nothing useful, redirect to marketing
      if (!tid) {
        window.location.href = `https://${APP_DOMAIN}/start`;
        return;
      }

      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) { setState('public'); return; }

      // Ensure profile exists for this tenant
      const { data: profile } = await sb.from('profiles').select('id').eq('id', session.user.id).eq('tenant_id', tid).single();
      if (!profile) {
        const displayName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'fan';
        await sb.from('profiles').insert({
          id: session.user.id, tenant_id: tid, display_name: displayName,
          avatar_url: session.user.user_metadata?.avatar_url || null,
          role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
        }).catch(() => {});
      }
      setState('app');
    };

    init();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) setState('app');
      else if (event === 'SIGNED_OUT') setState('public');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #F5EFE6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: 'var(--ruby, #8B1A2B)' }}>✦</div>
    </div>
  );

  if (state === 'public') return <PublicPage tenantId={tenantId} />;
  return <FlockApp tenantId={tenantId} />;
}
