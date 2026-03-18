'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Tenant } from '@/lib/tenant'

// ── Types ────────────────────────────────────────────────────────────────────
export type AuthMode = 'login' | 'signup'

interface Props {
  mode: AuthMode
  tenant: Tenant
}

// ── Icons ────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ animation: 'auth-spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AuthForm({ mode: initialMode, tenant }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isGooglePending, startGoogle] = useTransition()
  const palette = tenant.config.palette

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        router.push('/')
        router.refresh()
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) { setError(error.message); return }
        if (!data.user) { setError('Sign-up failed - please try again.'); return }

        // Insert profile row with correct tenant_id
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          tenant_id: tenant.id,
          email,
          display_name: displayName || null,
          stamp_count: 0,
          stamp_level: 1,
          role: 'fan',
        })
        if (profileError) { setError(profileError.message); return }

        // Email confirmation required
        if (!data.session) {
          setCheckEmail(true)
          return
        }

        // Trigger welcome email
        try {
          await fetch('/api/email/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email, displayName }),
          })
        } catch {
          // Non-fatal
        }

        router.push('/')
        router.refresh()
      }
    })
  }

  async function handleGoogle() {
    setError(null)
    startGoogle(async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) setError(error.message)
      void data
    })
  }

  // ── Check-email screen ─────────────────────────────────────────────────────
  if (checkEmail) {
    return (
      <>
        <AuthStyles palette={palette} />
        <div className="auth-shell">
          <div className="auth-card">
            <TenantMark name={tenant.name} palette={palette} />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p className="auth-heading" style={{ marginBottom: 8 }}>Check your email</p>
              <p className="auth-subtext">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <>
      <AuthStyles palette={palette} />
      <div className="auth-shell">
        <div className="auth-card">
          <TenantMark name={tenant.name} palette={palette} />

          {/* Mode tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
              onClick={() => { setMode('login'); setError(null) }}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
              onClick={() => { setMode('signup'); setError(null) }}
              type="button"
            >
              Create account
            </button>
          </div>

          {/* Google OAuth */}
          <button
            className="auth-btn-google"
            onClick={handleGoogle}
            disabled={isGooglePending || isPending}
            type="button"
          >
            {isGooglePending ? <Spinner /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <AuthField
                label="Display name"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
                required
              />
            )}
            <AuthField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <AuthField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {error && (
              <p className="auth-error">{error}</p>
            )}
            <button
              className="auth-btn-primary"
              type="submit"
              disabled={isPending || isGooglePending}
            >
              {isPending && <Spinner />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Toggle link */}
          <p className="auth-toggle">
            {mode === 'login' ? (
              <>No account?{' '}
                <button className="auth-toggle-btn" onClick={() => { setMode('signup'); setError(null) }} type="button">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button className="auth-toggle-btn" onClick={() => { setMode('login'); setError(null) }} type="button">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TenantMark({ name, palette }: { name: string; palette: Tenant['config']['palette'] }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: palette.RUBY,
        marginBottom: 10,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: palette.INK }}>
        {name}
      </p>
    </div>
  )
}

function AuthField({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="auth-label">{label}</label>
      <input
        className="auth-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
function AuthStyles({ palette }: { palette: Tenant['config']['palette'] }) {
  return (
    <style>{`
      @keyframes auth-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes auth-fade-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .auth-shell {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${palette.CREAM};
        padding: 24px 16px;
        font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
      }
      .auth-card {
        width: 100%;
        max-width: 480px;
        background: ${palette.SURFACE};
        border: 1px solid ${palette.BORDER};
        border-radius: 16px;
        padding: 36px 32px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.07);
        animation: auth-fade-up 0.3s ease both;
      }
      @media (max-width: 520px) {
        .auth-card { padding: 28px 20px; border-radius: 12px; }
      }
      .auth-heading {
        font-size: 17px;
        font-weight: 600;
        color: ${palette.INK};
        margin: 0 0 4px;
      }
      .auth-subtext {
        font-size: 13px;
        color: ${palette.SLATE};
        margin: 0;
        line-height: 1.55;
      }
      /* Tabs */
      .auth-tabs {
        display: flex;
        border-bottom: 1px solid ${palette.BORDER};
        margin-bottom: 20px;
      }
      .auth-tab {
        flex: 1;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: ${palette.SLATE};
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 10px 0;
        cursor: pointer;
        margin-bottom: -1px;
        transition: color 0.15s, border-color 0.15s;
        font-family: inherit;
      }
      .auth-tab--active {
        color: ${palette.RUBY};
        border-bottom-color: ${palette.RUBY};
        font-weight: 600;
      }
      /* Google button */
      .auth-btn-google {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 11px 16px;
        background: ${palette.SURFACE};
        border: 1px solid ${palette.BORDER};
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: ${palette.INK};
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        margin-bottom: 16px;
        font-family: inherit;
      }
      .auth-btn-google:hover:not(:disabled) { background: ${palette.CREAM}; }
      .auth-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
      /* Divider */
      .auth-divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
      }
      .auth-divider-line { flex: 1; height: 1px; background: ${palette.BORDER}; }
      .auth-divider-text { font-size: 12px; color: ${palette.SLATE}; letter-spacing: 0.05em; }
      /* Fields */
      .auth-label {
        font-size: 12px;
        font-weight: 600;
        color: ${palette.INK};
        letter-spacing: 0.03em;
      }
      .auth-input {
        padding: 10px 13px;
        border: 1px solid ${palette.BORDER};
        border-radius: 8px;
        font-size: 14px;
        color: ${palette.INK};
        background: ${palette.SURFACE};
        font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
        -webkit-appearance: none;
      }
      .auth-input:focus {
        outline: none;
        border-color: ${palette.RUBY};
        box-shadow: 0 0 0 3px ${palette.RUBY}22;
      }
      .auth-input:-webkit-autofill {
        -webkit-box-shadow: 0 0 0 1000px ${palette.SURFACE} inset;
        -webkit-text-fill-color: ${palette.INK};
      }
      /* Error */
      .auth-error {
        margin: 0;
        padding: 10px 13px;
        background: ${palette.RUBY}14;
        border: 1px solid ${palette.RUBY}33;
        border-radius: 8px;
        font-size: 13px;
        color: ${palette.RUBY};
        line-height: 1.45;
      }
      /* Primary button */
      .auth-btn-primary {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: ${palette.RUBY};
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: filter 0.15s, opacity 0.15s;
        font-family: inherit;
        letter-spacing: 0.02em;
        margin-top: 4px;
      }
      .auth-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
      .auth-btn-primary:active:not(:disabled) { filter: brightness(0.95); }
      .auth-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
      /* Toggle */
      .auth-toggle {
        text-align: center;
        font-size: 13px;
        color: ${palette.SLATE};
        margin: 16px 0 0;
      }
      .auth-toggle-btn {
        background: none;
        border: none;
        color: ${palette.RUBY};
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    `}</style>
  )
}
