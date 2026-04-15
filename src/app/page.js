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
      // Clear any bad cached bg colours from previous deploy
      Object.keys(localStorage).filter(k => k.startsWith('flock_bg_')).forEach(k => localStorage.removeItem(k));

      // Root domain - redirect to marketing page
      if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
        window.location.href = '/start';
        return;
      }

      // Just signed up - skip straight to app state to avoid flash
      if (sessionStorage.getItem('flock_just_signed_up')) {
        sessionStorage.removeItem('flock_just_signed_up');
        setState('app');
        // Still resolve tenantId in background
        if (host.endsWith(`.${APP_DOMAIN}`)) {
          const slug = host.replace(`.${APP_DOMAIN}`, '');
          const sb2 = getSupabase();
          const { data: tenant } = await sb2.from('tenants').select('id').eq('slug', slug).single();
          if (tenant?.id) setTenantId(tenant.id);
        }
        return;
      }

      let tid = null;
      if (host.endsWith(`.${APP_DOMAIN}`)) {
        const slug = host.replace(`.${APP_DOMAIN}`, '');
        // Run tenant lookup and session check in parallel
        const [tenantRes, sessionRes] = await Promise.all([
          sb.from('tenants').select('id').eq('slug', slug).single(),
          sb.auth.getSession(),
        ]);
        tid = tenantRes.data?.id || null;
        setTenantId(tid);

        if (!tid) {
          window.location.href = `https://${APP_DOMAIN}/start`;
          return;
        }

        const session = sessionRes.data?.session;
        if (!session?.user) { setState('public'); return; }

        // Ensure profile exists - fire and forget
        sb.from('profiles').select('id').eq('id', session.user.id).eq('tenant_id', tid).single().then(({ data: profile }) => {
          if (!profile) {
            const displayName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'fan';
            sb.from('profiles').insert({
              id: session.user.id, tenant_id: tid, display_name: displayName,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
            }).catch(() => {});
          }
        });

        setState('app');
        return;
      }

      // No subdomain match
      window.location.href = `https://${APP_DOMAIN}/start`;
    };

    init();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) setState('app');
      else if (event === 'SIGNED_OUT') setState('public');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#F5EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: '#8B1A2B', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }}>✦</div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }`}</style>
    </div>
  );

  if (state === 'public') return <PublicPage tenantId={tenantId} />;
  return <FlockApp tenantId={tenantId} />;
}
