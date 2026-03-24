'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

export function LandingPage() {
  const [mode, setMode] = useState('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState(null);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';

  // Resolve tenant from subdomain client-side - doesn't depend on server headers
  useEffect(() => {
    const host = window.location.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    if (host.endsWith(`.${appDomain}`)) {
      const slug = host.replace(`.${appDomain}`, '');
      const sb = getSupabase();
      sb.from('tenants').select('id, name').eq('slug', slug).single().then(({ data }) => {
        if (data) { setTenantName(data.name); setTenantId(data.id); }
      });
    }
    // Check if already signed in - redirect to home
    const sb = getSupabase();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) window.location.href = '/';
    });
  }, []);

  const sendMagicLink = async () => {
    if (!email.trim()) { setError('enter your email'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setMagicSent(true); setLoading(false);
  };

  const signInWithPassword = async () => {
    if (!email.trim() || !password) { setError('email and password required'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { data, error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data?.session) window.location.href = '/';
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
    if (data?.session && tenantId) {
      await sb.from('profiles').insert({
        id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(),
        role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
      }).catch(() => {});
      window.location.href = '/';
    } else {
      setError('check your email to confirm your account');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✦</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>{tenantName || 'flock'}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>fan community</div>
        </div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginBottom: 10, textTransform: 'lowercase' }}>check your email</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, marginBottom: 20 }}>
                magic link sent to<br />
                <span style={{ color: RUBY, fontWeight: 600 }}>{email}</span><br />
                click it to sign in
              </div>
              <button onClick={() => { setMagicSent(false); setEmail(''); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>use a different email</button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
                {[{ id: 'magic', label: 'magic link' }, { id: 'password', label: 'password' }, { id: 'signup', label: 'join' }].map(tab => (
                  <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: mode === tab.id ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: mode === tab.id ? RUBY : SLATE, fontWeight: mode === tab.id ? 600 : 400 }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Google */}
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
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'magic' ? sendMagicLink() : mode === 'password' ? signInWithPassword() : signUp())} placeholder="you@example.com" autoFocus
                  style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>

              {(mode === 'password' || mode === 'signup') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? signInWithPassword() : signUp())} placeholder="at least 8 characters"
                    style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              )}

              {mode === 'magic' && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '99', marginBottom: 16, lineHeight: 1.6 }}>we'll email you a link · click it · you're in · no password needed</div>}

              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>}

              <button onClick={mode === 'magic' ? sendMagicLink : mode === 'password' ? signInWithPassword : signUp} disabled={loading}
                style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? '...' : mode === 'magic' ? 'send magic link ✦' : mode === 'password' ? 'sign in' : 'join community'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77' }}>
          powered by flock · fan communities for independent artists
        </div>
      </div>
    </div>
  );
}


export function LandingPage() {
  const { signInWithGoogle, tenantId } = useAuth();
  const [mode, setMode] = useState('magic'); // 'magic' | 'password' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [tenant, setTenant] = useState(null);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';
  const BLUSH = 'var(--blush)';

  useEffect(() => {
    if (!tenantId) return;
    const sb = getSupabase();
    sb.from('tenants').select('name').eq('id', tenantId).single().then(({ data }) => {
      if (data) setTenant(data);
    });
  }, [tenantId]);

  const sendMagicLink = async () => {
    if (!email.trim()) { setError('enter your email'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error: err } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    if (err) { setError(err.message); setLoading(false); return; }
    setMagicSent(true); setLoading(false);
  };

  const signInWithPassword = async () => {
    if (!email.trim() || !password) { setError('email and password required'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setError(err.message); setLoading(false); }
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
    // Create profile if auto-signed in
    if (data?.session && tenantId) {
      await sb.from('profiles').insert({
        id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(),
        role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true,
      }).catch(() => {});
    }
    setLoading(false);
  };

  const tenantName = tenant?.name || 'this community';

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✦</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>{tenantName}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>fan community</div>
        </div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>

          {/* Magic link sent state */}
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginBottom: 10, textTransform: 'lowercase' }}>check your email</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, marginBottom: 20 }}>
                we sent a magic link to<br />
                <span style={{ color: RUBY, fontWeight: 600 }}>{email}</span><br />
                click it to sign in instantly
              </div>
              <button onClick={() => { setMagicSent(false); setEmail(''); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>use a different email</button>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
                {[
                  { id: 'magic', label: 'magic link' },
                  { id: 'password', label: 'password' },
                  { id: 'signup', label: 'join' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: mode === tab.id ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: mode === tab.id ? RUBY : SLATE, fontWeight: mode === tab.id ? 600 : 400 }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button onClick={signInWithGoogle} style={{ width: '100%', padding: '12px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: INK, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88' }}>or</span>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
              </div>

              {/* Email field - always shown */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && mode === 'magic' && sendMagicLink()} placeholder="you@example.com" autoFocus
                  style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>

              {/* Signup: name field */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>your name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="how you'll appear in the community"
                    style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              )}

              {/* Password/signup: password field */}
              {(mode === 'password' || mode === 'signup') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? signInWithPassword() : signUp())} placeholder="at least 8 characters" minLength={8}
                    style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              )}

              {mode === 'magic' && (
                <div style={{ marginBottom: 16, marginTop: 4 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '99', lineHeight: 1.6 }}>
                    we'll email you a link · click it · you're in · no password needed
                  </div>
                </div>
              )}

              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>}

              <button onClick={mode === 'magic' ? sendMagicLink : mode === 'password' ? signInWithPassword : signUp} disabled={loading}
                style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? '...' : mode === 'magic' ? 'send magic link ✦' : mode === 'password' ? 'sign in' : 'join community'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', letterSpacing: '0.5px' }}>
          powered by flock · fan communities for independent artists
        </div>
      </div>
    </div>
  );
}
