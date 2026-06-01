import { createBrowserClient } from '@supabase/ssr';

let client = null;

// Derive the cookie domain so sessions are shared across all tenant subdomains.
// e.g. on dustintebbutt.fans-flock.com this returns '.fans-flock.com'
// On localhost or vercel preview URLs it returns undefined (default per-host behaviour).
function getCookieDomain() {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host.endsWith('fans-flock.com')) return '.fans-flock.com';
  return undefined;
}

export function getSupabase() {
  if (!client) {
    const cookieDomain = getCookieDomain();
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      cookieDomain ? { cookieOptions: { domain: cookieDomain, path: '/', sameSite: 'lax', secure: true } } : undefined,
    );
  }
  return client;
}

// Legacy default export for compatibility
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
