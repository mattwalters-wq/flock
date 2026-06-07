'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PublicPage } from '@/components/PublicPage';
import { FlockApp } from '@/components/FlockApp';
import { MarketingHome } from '@/components/MarketingHome';

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

    const init = async () => {
      if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) {
        setState('marketing'); // apex/marketing homepage
        return;
      }

      let tid = null;
      try {
        if (host.endsWith(`.${APP_DOMAIN}`)) {
          const slug = host.replace(`.${APP_DOMAIN}`, '');
          const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
          tid = tenant?.id || null;
        }
      } catch {
        tid = null; // fall through; never leave the page hanging on the spinner
      }
      setTenantId(tid);
      setTenantChecked(true);

      if (!tid) {
        window.location.href = `https://${APP_DOMAIN}/start`;
      }
    };

    init();
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
        if (!profile && !cancelled) {
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

  if (state === 'marketing') return <MarketingHome />;
  if (state === 'public') return <PublicPage tenantId={tenantId} />;
  return <FlockApp tenantId={tenantId} />;
}
