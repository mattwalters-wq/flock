'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0'; const BORDER = '#E8DDD4';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the token in the URL hash - just need to check we have a session
    const sb = getSupabase();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Also check existing session
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, []);

  const updatePassword = async () => {
    if (!password || password.length < 8) { setError('password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('passwords do not match'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    const { error: updateErr } = await sb.auth.updateUser({ password });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => { window.location.href = '/'; }, 2500);
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
          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>password updated</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>redirecting you back to your community...</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>set new password</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>choose a new password for your flock account</div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>new password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="at least 8 characters"
                    style={{ width: '100%', padding: '12px 44px 12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>
                    {showPw ? 'hide' : 'show'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>confirm password</label>
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && updatePassword()} placeholder="same password again"
                  style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>

              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 14 }}>{error}</div>}

              <button onClick={updatePassword} disabled={loading || !ready}
                style={{ width: '100%', padding: '14px', background: RUBY, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (loading || !ready) ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? '...' : 'update password →'}
              </button>
              {!ready && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 10, textAlign: 'center' }}>loading session...</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
