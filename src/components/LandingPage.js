'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export function LandingPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, tenantId, supabase } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenant, setTenant] = useState(null);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';

  useEffect(() => {
    if (!tenantId || !supabase) return;
    supabase.from('tenants').select('name').eq('id', tenantId).single().then(({ data }) => {
      if (data) setTenant(data);
    });
  }, [tenantId, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'login') {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err.message);
      } else {
        if (!displayName.trim()) { setError('please enter your name'); setLoading(false); return; }
        const { data, error: err } = await signUpWithEmail(email, password, displayName.trim());
        if (err) {
          setError(err.message);
        } else if (data?.user && !data?.session) {
          // Email confirmation required
          setSuccess('check your email to confirm your account, then come back and sign in ✦');
        } else if (data?.session) {
          // Auto-logged in - create profile if needed
          if (tenantId && data.user) {
            const sb = supabase;
            const { data: existing } = await sb.from('profiles').select('id').eq('id', data.user.id).eq('tenant_id', tenantId).single();
            if (!existing) {
              await sb.from('profiles').insert({
                id: data.user.id,
                tenant_id: tenantId,
                display_name: displayName.trim(),
                role: 'fan',
                point_count: 0,
                point_level: 'first_press',
                email_notifications: true,
              }).then(() => {
                fetch('/api/email/welcome', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, displayName: displayName.trim(), tenantId }),
                }).catch(() => {});
              });
            }
          }
        }
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const tenantName = tenant?.name || 'this community';

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✦</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>{tenantName}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>fan community</div>
        </div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: mode === m ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: mode === m ? RUBY : SLATE, fontWeight: mode === m ? 600 : 400 }}>
                {m === 'login' ? 'sign in' : 'join'}
              </button>
            ))}
          </div>

          <button onClick={signInWithGoogle} style={{ width: '100%', padding: '12px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: INK, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88' }}>or</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 14, color: INK, fontWeight: 600, marginBottom: 8 }}>almost there</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.6 }}>{success}</div>
              <button onClick={() => { setSuccess(''); setMode('login'); }} style={{ marginTop: 16, padding: '10px 20px', background: RUBY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>your name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="how you'll appear in the community" required
                    style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="at least 8 characters" required minLength={8}
                  style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>
              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? '...' : mode === 'login' ? 'sign in' : 'join community'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', letterSpacing: '0.5px' }}>
          powered by flock · fan communities for independent artists
        </div>
      </div>
    </div>
  );
}
