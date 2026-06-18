'use client';
import { useState, useEffect } from 'react';
import { getSupabase, authErrorMessage } from '@/lib/supabase-browser';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0'; const BORDER = '#E8DDD4';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // 'loading' → still establishing the recovery session
  // 'ready'   → a real session exists; the form can be submitted
  // 'invalid' → the link was expired/already used; show "request a fresh one"
  const [phase, setPhase] = useState('loading');
  const ready = phase === 'ready';

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    const markReady = () => { if (!cancelled) { setError(''); setPhase('ready'); } };
    const markInvalid = (msg) => { if (!cancelled) { setError(msg); setPhase('invalid'); } };

    // A real PASSWORD_RECOVERY/SIGNED_IN event with a session is the happy path.
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });

    (async () => {
      const hash = new URLSearchParams((typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, ''));
      const query = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

      // 1. GoTrue redirects back with an explicit error when the one-time token is
      // expired or already consumed (e.g. the link was clicked twice, or an email
      // scanner pre-opened it). Trust that instead of letting the user type a
      // password that can never be saved.
      const errCode = hash.get('error_code') || query.get('error_code');
      if (errCode) {
        const desc = (hash.get('error_description') || query.get('error_description') || '').replace(/\+/g, ' ');
        return markInvalid(/expired|otp/i.test(errCode)
          ? 'this reset link has expired or was already used — request a fresh one below'
          : (desc ? decodeURIComponent(desc) : 'this reset link is invalid — request a fresh one below'));
      }

      // 2. Recovery session already established (hash flow auto-detected, or a
      // session left over from the link's first verify).
      const { data: { session } } = await sb.auth.getSession();
      if (session) return markReady();

      // 3. PKCE flow: the link came back as ?code=… — exchange it explicitly so a
      // failure surfaces here, not after the user has typed a new password.
      const code = query.get('code');
      if (code) {
        const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
        if (!exErr) {
          // Scrub the code so a refresh/re-mount can't try to reuse it.
          try { window.history.replaceState(null, '', window.location.pathname); } catch {}
          return markReady();
        }
        return markInvalid('this reset link is invalid or has expired — request a fresh one below');
      }

      // 4. Implicit hash tokens are still being processed by the client; the
      // onAuthStateChange handler above will flip us to ready when they land.
      if (hash.get('access_token')) return;

      // 5. The page was opened without any recovery token at all.
      markInvalid('open the most recent reset link from your email to set a new password');
    })().catch(() => markInvalid('could not verify your reset link — request a fresh one below'));

    return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const updatePassword = async () => {
    if (!password || password.length < 8) { setError('password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('passwords do not match'); return; }
    setLoading(true); setError('');
    const sb = getSupabase();
    try {
      // Guard: never call updateUser without a live session — that's what produced
      // the bare "session expired" with no way forward. Send them back for a fresh link.
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setPhase('invalid');
        setError('your reset link expired before the password could be saved — request a fresh one below');
        setLoading(false);
        return;
      }
      const { error: updateErr } = await Promise.race([
        sb.auth.updateUser({ password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
      if (updateErr) { setError(authErrorMessage(updateErr)); setLoading(false); return; }
      setDone(true);
      setTimeout(() => { window.location.href = '/'; }, 2500);
    } catch (e) {
      setError(e?.message === 'timeout'
        ? 'this is taking too long — your reset link may be expired, or your network is rate-limited. request a fresh link or try mobile data.'
        : authErrorMessage(e));
      setLoading(false);
    }
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
          ) : phase === 'invalid' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>reset link expired</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 4, lineHeight: 1.6 }}>{error}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 20, lineHeight: 1.6 }}>
                reset links can only be opened once — open the newest email, or request a new link.
              </div>
              <a href="/login" style={{ display: 'block', width: '100%', padding: '14px', background: RUBY, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', boxSizing: 'border-box' }}>
                request a new link →
              </a>
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
              {phase === 'loading' && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 10, textAlign: 'center' }}>verifying your reset link...</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
