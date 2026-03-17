import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Creates a Supabase server client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * @param tenantSlug  When provided the client immediately calls set_tenant(slug)
 *                    so every subsequent query respects the tenant's RLS policies.
 */
export async function createClient(tenantSlug?: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // The middleware handles session refresh so this is safe to swallow.
          }
        },
      },
    }
  )

  // Activate RLS tenant isolation for this request
  if (tenantSlug) {
    await supabase.rpc('set_tenant', { slug: tenantSlug })
  }

  return supabase
}
