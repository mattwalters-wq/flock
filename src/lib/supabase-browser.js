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

export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
