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
  const [mode, setMode] = useState('signin'); // signin | reset
  const [resetSent, setResetSent] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) { setError('email and password required'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { data, error: signInErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (signInErr) { setError(signInErr.message); setLoading(false); return; }

    const { data: profiles } = await sb.from('profiles').select('tenant_id, tenants(slug)').eq('id', data.user.id).limit(1);
    const slug = profiles?.[0]?.tenants?.slug;
    if (slug) {
      window.location.href = `https://${slug}.${APP_DOMAIN}`;
    } else {
      window.location.href = `/start`;
    }
  };

  const sendReset = async () => {
    if (!email.trim()) { setError('enter your email address'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { error: resetErr } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (resetErr) { setError(resetErr.message); setLoading(false); return; }
    setResetSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');`}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/start" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: CREAM }}>✦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: CREAM, textTransform: 'lowercase' }}>flock</div>
          </a>
        </div>

        <div style={{ background: SURFACE, borderRadius: 18, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          <div style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>sign in to flock</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 20 }}>we'll find your community automatically</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="you@example.com" autoFocus
              style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>

          {resetSent && (
            <div style={{ background: '#7D8B6A22', border: '1px solid #7D8B6A44', borderRadius: 10, padding: '14px', marginBottom: 16, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7D8B6A', lineHeight: 1.6 }}>
              reset link sent to <strong>{email}</strong> — check your inbox and spam folder
            </div>
          )}
          {mode === 'reset' && !resetSent && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 16, lineHeight: 1.6 }}>
              enter your email and we'll send you a link to reset your password
            </div>
          )}
          {mode === 'signin' && <div style={{ marginBottom: 20, position: 'relative' }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>password</label>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="your password"
              style={{ width: '100%', padding: '12px 44px 12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '60%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>
              {showPw ? 'hide' : 'show'}
            </button>
          {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 14 }}>{error}</div>}

          <button onClick={mode === "reset" ? sendReset : signIn} disabled={loading}
            style={{ width: '100%', padding: '14px', background: RUBY, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? '...' : mode === 'reset' ? 'send reset link →' : 'sign in →'}
          </button>
          {mode === 'signin' && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={() => { setMode('reset'); setError(''); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                forgot password?
              </button>
            </div>
          )}
          {mode === 'reset' && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={() => { setMode('signin'); setError(''); setResetSent(false); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                back to sign in
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '44' }}>
            don't have a community yet?{' '}
            <a href="/start?join=1" style={{ color: RUBY, textDecoration: 'none', fontWeight: 600 }}>get started →</a>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '33' }}>
          <a href="/terms" style={{ color: CREAM + '33', textDecoration: 'none' }}>terms</a>
          {' · '}
          <a href="/privacy" style={{ color: CREAM + '33', textDecoration: 'none' }}>privacy</a>
        </div>
      </div>
    </div>
  );
}
