import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

/**
 * Singleton Supabase browser client.
 *
 * Tenant context is NOT set here — that is handled server-side via the
 * middleware (x-tenant-slug header) and lib/supabase/server.ts.
 * Client components that need tenant data should read it from context or
 * props passed down from a Server Component.
 */
let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (_client) return _client

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return _client
}
