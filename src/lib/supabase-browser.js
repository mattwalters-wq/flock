import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

let client = null;
let anonClient = null;

// A sessionless client that only ever sends the anon key — never a user JWT.
// Use this for public reads that must not fail while a user session is in flux
// (e.g. resolving a tenant by slug during the god-mode session handoff). With the
// authed client, an expired/handoff token makes PostgREST 401 the whole request
// before it even reaches the public tenants table.
export function getAnonClient() {
  if (!anonClient) {
    anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return anonClient;
}

// Circuit breaker for the auth token-refresh endpoint.
//
// A stale refresh token against a rate-limited IP makes gotrue-js loop: it
// treats 429/5xx as retryable, so every retry draws another 429 and spawns more
// retries (~28k requests from one IP in production, locking out a whole office).
// This guard caps that: if refreshes fail in a rapid burst it briefly stops
// hitting the network and *replays the real server response* so the app shows an
// accurate, friendly message — never internal jargon.
//
// Deliberately narrow so it can't disrupt normal auth:
//   - only `grant_type=refresh_token` is ever touched (sign-in/up/recovery pass through)
//   - a plain 400 (genuinely dead token) passes through so gotrue clears the
//     session itself — no loop, no interference
//   - it only opens on a tight burst of retryable failures, not a one-off refresh
//   - state is persisted (localStorage) so the cooldown survives this app's
//     frequent full-page reloads and is shared across tabs
const BREAKER_KEY = 'flock_refresh_breaker_v2';
const FAIL_THRESHOLD = 5;   // retryable failures within the window before we open
const WINDOW_MS = 5000;     // they must cluster into a real storm, not normal use
const OPEN_MS = 20000;      // brief cooldown once tripped

function readBreaker() {
  try { return JSON.parse(localStorage.getItem(BREAKER_KEY)) || {}; } catch { return {}; }
}
function writeBreaker(state) {
  try { localStorage.setItem(BREAKER_KEY, JSON.stringify(state)); } catch {}
}
function clearBreaker() {
  try { localStorage.removeItem(BREAKER_KEY); } catch {}
}

function makeGuardedFetch() {
  const hasStore = typeof window !== 'undefined' && !!window.localStorage;

  return async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    const isRefresh = url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');

    if (isRefresh && hasStore) {
      const b = readBreaker();
      if (b.openUntil && Date.now() < b.openUntil) {
        // Cooldown active: replay the last real failure without touching the
        // network, so the loop can't keep hammering the auth server.
        const status = b.lastStatus || 429;
        const body = b.lastBody || JSON.stringify({ error: 'over_request_rate_limit', message: 'Request rate limit reached' });
        return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const res = await fetch(input, init);
    if (!isRefresh || !hasStore) return res;

    // Only retryable failures fuel the loop; a 400 (dead token) is handled by
    // gotrue on its own, so leave it alone.
    const now = Date.now();
    if (res.status === 429 || res.status >= 500) {
      const b = readBreaker();
      const within = b.windowStart && now - b.windowStart < WINDOW_MS;
      const fails = within ? (b.fails || 0) + 1 : 1;
      let lastBody = '';
      try { lastBody = await res.clone().text(); } catch {}
      if (fails >= FAIL_THRESHOLD) {
        writeBreaker({ openUntil: now + OPEN_MS, lastStatus: res.status, lastBody });
      } else {
        writeBreaker({ fails, windowStart: within ? b.windowStart : now, lastStatus: res.status, lastBody });
      }
    } else {
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
  if (/refresh token|session (missing|expired|not found)|auth session/i.test(m)) return 'your session expired — please sign in again';
  return m;
}
