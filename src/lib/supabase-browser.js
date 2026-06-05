import { createBrowserClient } from '@supabase/ssr';

let client = null;

// Circuit breaker for the auth token-refresh endpoint.
//
// A stale/invalid refresh token can send gotrue-js into a tight retry loop: it
// treats 429s (and 5xx) as retryable, so once the per-IP rate limit trips, every
// retry gets a 429 which spawns yet another retry. In production this snowballed
// to ~28k refresh requests from a single IP, locking out everyone behind that IP
// (e.g. a whole office network). This guard caps the damage: after a couple of
// failed refreshes it short-circuits and returns a terminal `invalid_grant`,
// which makes gotrue clear the dead session and stop auto-refreshing.
//
// The breaker state is persisted in localStorage (not just in memory) so the
// cooldown survives this app's frequent full-page reloads and is shared across
// tabs — otherwise a fresh client per reload would reset the counter and keep
// leaking a failed refresh on every load.
//
// It only ever intercepts `grant_type=refresh_token` — password sign-in, sign-up
// and every other request pass straight through untouched.
const BREAKER_KEY = 'flock_refresh_breaker';
const FAIL_THRESHOLD = 2;     // failures within the window before we open
const WINDOW_MS = 60000;      // rolling window for counting failures
const OPEN_MS = 120000;       // how long the breaker stays open once tripped

function readBreaker() {
  try {
    return JSON.parse(localStorage.getItem(BREAKER_KEY)) || {};
  } catch { return {}; }
}
function writeBreaker(state) {
  try { localStorage.setItem(BREAKER_KEY, JSON.stringify(state)); } catch {}
}
function clearBreaker() {
  try { localStorage.removeItem(BREAKER_KEY); } catch {}
}

function makeGuardedFetch() {
  const hasStore = typeof window !== 'undefined' && !!window.localStorage;

  const terminalRefreshResponse = () =>
    new Response(
      JSON.stringify({ error: 'invalid_grant', error_description: 'refresh suppressed by client circuit breaker' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  return async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    const isRefresh = url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');

    if (isRefresh && hasStore) {
      const b = readBreaker();
      // Circuit open: refuse to fire more refreshes, hand gotrue a terminal
      // error so it gives up on the dead token rather than retrying.
      if (b.openUntil && Date.now() < b.openUntil) {
        return terminalRefreshResponse();
      }
    }

    const res = await fetch(input, init);
    if (!isRefresh || !hasStore) return res;

    const now = Date.now();
    if (res.status === 429 || res.status === 400 || res.status >= 500) {
      const b = readBreaker();
      const fails = (b.windowStart && now - b.windowStart < WINDOW_MS) ? (b.fails || 0) + 1 : 1;
      if (fails >= FAIL_THRESHOLD) {
        writeBreaker({ openUntil: now + OPEN_MS });
      } else {
        writeBreaker({ fails, windowStart: b.windowStart && now - b.windowStart < WINDOW_MS ? b.windowStart : now });
      }
    } else if (res.ok) {
      clearBreaker();
    }
    return res;
  };
}

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { fetch: makeGuardedFetch() } },
    );
  }
  return client;
}

// Legacy default export for compatibility
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;

// Turn raw Supabase auth errors into copy that won't make users mash the button.
// A rate-limit 429 is per-IP and clears on its own, so tell them to wait rather
// than retry instantly (each retry only deepens the hole).
export function authErrorMessage(error) {
  const m = error?.message || 'something went wrong, please try again';
  if (/rate limit/i.test(m)) return 'too many attempts right now — please wait a minute, then try again';
  return m;
}
