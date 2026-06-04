import { createBrowserClient } from '@supabase/ssr';

let client = null;

// Circuit breaker for the auth token-refresh endpoint.
//
// A stale/invalid refresh token can send gotrue-js into a tight retry loop: it
// treats 429s (and 5xx) as retryable, so once the per-IP rate limit trips, every
// retry gets a 429 which spawns yet another retry. In production this snowballed
// to ~28k refresh requests from a single IP in minutes, locking out everyone
// behind that IP. This guard caps the damage: after a few consecutive failed
// refreshes it short-circuits and returns a terminal `invalid_grant`, which makes
// gotrue clear the dead session and stop auto-refreshing instead of hammering.
//
// It only ever intercepts `grant_type=refresh_token` — password sign-in, sign-up
// and every other request pass straight through untouched.
function makeGuardedFetch() {
  let failures = 0;
  let openUntil = 0;
  let lastFail = 0;
  const FAIL_THRESHOLD = 3;
  const OPEN_MS = 30000;
  const STREAK_RESET_MS = 60000;

  const terminalRefreshResponse = () =>
    new Response(
      JSON.stringify({ error: 'invalid_grant', error_description: 'refresh suppressed by client circuit breaker' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  return async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    const isRefresh = url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');

    // Circuit open: refuse to fire more refreshes, hand gotrue a terminal error
    // so it gives up on the dead token rather than retrying.
    if (isRefresh && Date.now() < openUntil) {
      return terminalRefreshResponse();
    }

    const res = await fetch(input, init);
    if (!isRefresh) return res;

    const now = Date.now();
    if (res.status === 429 || res.status === 400 || res.status >= 500) {
      if (now - lastFail > STREAK_RESET_MS) failures = 0; // stale streak, start fresh
      failures += 1;
      lastFail = now;
      if (failures >= FAIL_THRESHOLD) {
        openUntil = now + OPEN_MS;
        failures = 0;
      }
    } else if (res.ok) {
      failures = 0;
      openUntil = 0;
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
