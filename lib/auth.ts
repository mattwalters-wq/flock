import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  tenant_id: number
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type AuthUser = {
  id: string
  email: string
  profile: Profile
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the current Supabase auth user, or null if not signed in.
 * Safe to call from Server Components and Server Actions.
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

/**
 * Returns the current user's profile row, scoped to the given tenant.
 * Returns null if the user is not authenticated or has no profile for this tenant.
 */
export async function getTenantUser(tenantId: number): Promise<AuthUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, tenant_id, email, display_name, avatar_url, created_at')
    .eq('id', user.id)
    .eq('tenant_id', tenantId)
    .single() as { data: Profile | null; error: unknown }

  if (error || !profile) return null

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile,
  }
}

/**
 * Requires the user to be authenticated and have a profile for this tenant.
 * Redirects to the tenant login page if not. Use in Server Components / page.tsx.
 */
export async function requireTenantAuth(
  tenantId: number,
  slug: string,
  next?: string
): Promise<AuthUser> {
  const authUser = await getTenantUser(tenantId)

  if (!authUser) {
    const loginPath = next
      ? `/${slug}/login?next=${encodeURIComponent(next)}`
      : `/${slug}/login`
    redirect(loginPath)
  }

  return authUser
}
 
