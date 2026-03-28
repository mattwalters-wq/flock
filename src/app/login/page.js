'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0'; const BORDER = '#E8DDD4';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('password'); // password | magic
  const [magicSent, setMagicSent] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) { setError('email and password required'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { data, error: signInErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (signInErr) { setError(signInErr.message); setLoading(false); return; }

    // Find which community they belong to
    const { data: profiles } = await sb.from('profiles').select('tenant_id, tenants(slug)').eq('id', data.user.id).limit(1);
    const slug = profiles?.[0]?.tenants?.slug;
    if (slug) {
      window.location.href = `https://${slug}.${APP_DOMAIN}`;
    } else {
      // No community found - send to start
      window.location.href = `/start`;
    }
  };

  const sendMagic = async () => {
    if (!email.trim() || !email.includes('@')) { setError('enter a valid email'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { error: magicErr } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `https://${APP_DOMAIN}/auth/callback` } });
    if (magicErr) { setError(magicErr.message); setLoading(false); return; }
    setMagicSent(true); setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');`}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/start" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: CREAM }}>✦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: CREAM, textTransform: 'lowercase' }}>flock</div>
          </a>
        </div>

        <div style={{ background: SURFACE, borderRadius: 18, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>check your email</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7 }}>
                magic link sent to <strong style={{ color: RUBY }}>{email}</strong><br />
                click it to sign in to your community
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
                {[{ id: 'password', label: 'password' }, { id: 'magic', label: 'magic link' }].map(tab => (
                  <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }}
                    style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: mode === tab.id ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: mode === tab.id ? RUBY : SLATE, fontWeight: mode === tab.id ? 600 : 400, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>sign in to flock</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 20 }}>
                {mode === 'password' ? "we'll find your community automatically" : "we'll email you a link · click it · you're in"}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? signIn() : sendMagic())} placeholder="you@example.com" autoFocus
                  style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>

              {mode === 'password' && (
                <div style={{ marginBottom: 20, position: 'relative' }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>password</label>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="your password"
                    style={{ width: '100%', padding: '12px 44px 12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '60%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>
                    {showPw ? 'hide' : 'show'}
                  </button>
                </div>
              )}

              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 14 }}>{error}</div>}

              <button onClick={mode === 'password' ? signIn : sendMagic} disabled={loading}
                style={{ width: '100%', padding: '14px', background: RUBY, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? '...' : mode === 'password' ? 'sign in →' : 'send magic link'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '44' }}>
            don't have a community yet?{' '}
            <a href="/start?join=1" style={{ color: RUBY, textDecoration: 'none', fontWeight: 600 }}>get started →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
