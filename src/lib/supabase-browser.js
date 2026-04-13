import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookieOptions: {
          domain: '.fans-flock.com',
          sameSite: 'lax',
          secure: true,
          path: '/',
        },
      }
    );
  }
  return client;
}

// Legacy default export for compatibility
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
