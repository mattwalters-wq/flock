'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

export function LandingPage() {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';

  useEffect(() => {
    const sb = getSupabase();
    const host = window.location.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    if (host.endsWith(`.${appDomain}`)) {
      const slug = host.replace(`.${appDomain}`, '');
      sb.from('tenants').select('id, name').eq('slug', slug).single().then(({ data }) => {
        if (data) {
          setTenantName(data.name);
          setTenantId(data.id);
          sb.from('tenant_config').select('key, value').eq('tenant_id', data.id).in('key', ['logo_url', 'color_ruby', 'color_cream', 'color_ink']).then(({ data: cfg }) => {
            if (cfg) cfg.forEach(({ key, value }) => {
              if (key === 'logo_url' && value) setLogoUrl(value);
              if (key === 'color_ruby' && value) document.documentElement.style.setProperty('--ruby', value);
              if (key === 'color_cream' && value) document.documentElement.style.setProperty('--cream', value);
              if (key === 'color_ink' && value) document.documentElement.style.setProperty('--ink', value);
            });
          });
        }
      });
    }
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) window.location.href = '/';
    });
  }, []);

  const signInWithPassword = async () => {
    if (!email.trim() || !password) { setError('email and password required'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { data, error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data?.session) {
      if (tenantId) {
        const { data: existing } = await sb.from('profiles').select('id').eq('id', data.user.id).eq('tenant_id', tenantId).single();
        if (!existing) {
          const name = data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'fan';
          try { await sb.from('profiles').insert({
            id: data.user.id, tenant_id: tenantId, display_name: name,
            role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
          });
        }
      }
      window.location.href = '/';
    }
  };

  const signInWithGoogle = async () => {
    const sb = getSupabase();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const signUp = async () => {
    if (!email.trim() || !password || !displayName.trim()) { setError('all fields required'); return; }
    if (password.length < 8) { setError('password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { data, error: err } = await sb.auth.signUp({
      email: email.trim(), password,
      options: { data: { display_name: displayName.trim(), tenant_id: tenantId } }
    });
    if (err) { setError(err.message); setLoading(false); return; }

    // Try immediate sign-in so user goes straight to feed
    const { data: signInData } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    const session = signInData?.session || data?.session;

    if (session && tenantId) {
      try { await sb.from('profiles').insert({
        id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(),
        role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
      });
      window.location.href = '/';
      return;
    }

    if (data?.user && tenantId) {
      try { await sb.from('profiles').insert({
        id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(),
        role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
      });
      window.location.href = '/';
    } else {
      setError('something went wrong, please try again');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {logoUrl ? (
            <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
              <img src={logoUrl} alt={tenantName} style={{ height: 56, maxWidth: 200, objectFit: 'contain', display: 'block' }} />
            </div>
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 14, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✦</div>
          )}
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>{tenantName || 'flock'}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>fan community</div>
        </div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
            {[{ id: 'signup', label: 'join' }, { id: 'password', label: 'sign in' }].map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: mode === tab.id ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: mode === tab.id ? RUBY : SLATE, fontWeight: mode === tab.id ? 600 : 400 }}>
                {tab.label}
              </button>
            ))}
          </div>

          <button onClick={signInWithGoogle} style={{ width: '100%', padding: '12px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: INK, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88' }}>or</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>your name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="how you'll appear in the community"
                style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? signInWithPassword() : signUp())} placeholder="you@example.com" autoFocus
              style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? signInWithPassword() : signUp())} placeholder="at least 8 characters"
                style={{ width: '100%', padding: '11px 44px 11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>
                {showPassword ? 'hide' : 'show'}
              </button>
            </div>
          </div>

          {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>}

          <button onClick={mode === 'password' ? signInWithPassword : signUp} disabled={loading}
            style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : mode === 'password' ? 'sign in' : 'join community'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77' }}>
          powered by <a href="https://fans-flock.com" style={{ color: SLATE + '77', textDecoration: 'none' }}>flock</a>
          {' · '}
          <a href="https://fans-flock.com/terms" style={{ color: SLATE + '77', textDecoration: 'none' }}>terms</a>
          {' · '}
          <a href="https://fans-flock.com/privacy" style={{ color: SLATE + '77', textDecoration: 'none' }}>privacy</a>
        </div>
      </div>
    </div>
  );
}
