import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'flock-auth-token',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return client;
}

// Legacy default export for compatibility
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
