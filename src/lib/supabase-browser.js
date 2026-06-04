import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
