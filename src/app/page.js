'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAnonClient } from '@/lib/supabase-browser';
import { PublicPage } from '@/components/PublicPage';
import { FlockApp } from '@/components/FlockApp';
import { isGod } from '@/lib/god';

export default function Home() {
  // Auth state comes from the single global AuthProvider — no second getSession
  // / onAuthStateChange here, so a page load only touches the auth server once.
  const { user, loading: authLoading, supabase } = useAuth();
  const [state, setState] = useState('loading');
  const [tenantId, setTenantId] = useState(null);
  const [tenantChecked, setTenantChecked] = useState(false);

  // Resolve which community (tenant) this subdomain maps to. Unchanged routing:
  // root domain and unknown subdomains still bounce to the marketing site.
  useEffect(() => {
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const host = window.location.hostname;

    let cancelled = false;
    const init = async () => {
      // Apex / www → marketing homepage.
      if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
        window.location.href = '/start';
        return;
      }
      // Not a flock subdomain at all → marketing.
      if (!host.endsWith(`.${APP_DOMAIN}`)) {
        window.location.href = `https://${APP_DOMAIN}/start`;
        return;
      }

      // Resolve the tenant with the anon client (never a user JWT) so the lookup
      // can't 401 while a session is in flux. A real subdomain must NEVER bounce
      // to the marketing homepage on a transient blip.
      const slug = host.replace(`.${APP_DOMAIN}`, '');
      const anon = getAnonClient();
      let tid = null;
      for (let attempt = 0; !tid && attempt < 4 && !cancelled; attempt++) {
        try {
          const { data } = await anon.from('tenants').select('id').eq('slug', slug).maybeSingle();
          tid = data?.id || null;
        } catch { /* retry */ }
        if (!tid) await new Promise(r => setTimeout(r, 300));
      }
      if (cancelled) return;
      setTenantId(tid);
      setTenantChecked(true);
      if (!tid) setState('notfound'); // genuinely unknown community — don't bounce to marketing
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Decide public vs app from the shared auth state once tenant + auth resolve.
  useEffect(() => {
    if (!tenantChecked || !tenantId || authLoading) return;
    if (!user) { setState('public'); return; }

    let cancelled = false;
    (async () => {
      try {
        // Ensure a profile exists for this tenant (e.g. first visit after OAuth).
        // maybeSingle() avoids a 406 when there's no row yet.
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).eq('tenant_id', tenantId).maybeSingle();
        // Never create a fan profile for the god admin — they act as admin in
        // every community without holding a membership row.
        if (!profile && !cancelled && !isGod(user)) {
          const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'fan';
          await supabase.from('profiles').insert({
            id: user.id, tenant_id: tenantId, display_name: displayName,
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
          });
        }
      } catch { /* don't block render on profile bootstrap */ }
      if (!cancelled) setState('app');
    })();
    return () => { cancelled = true; };
  }, [tenantChecked, tenantId, authLoading, user]);

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #F5EFE6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: 'var(--ruby, #8B1A2B)' }}>✦</div>
    </div>
  );

  if (state === 'notfound') return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #F5EFE6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'DM Sans', sans-serif", padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink, #1A1018)' }}>community not found</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--slate, #6A5A62)' }}>this flock community doesn’t exist or hasn’t finished setting up.</div>
      <a href={`https://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com'}/start`} style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--ruby, #8B1A2B)', textDecoration: 'none' }}>go to flock →</a>
    </div>
  );

  if (state === 'public') return <PublicPage tenantId={tenantId} />;
  return <FlockApp tenantId={tenantId} />;
}
