import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  tenant_id: number
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type AuthUser = {
  id: string
  email: string
  profile: Profile
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
 * Returns the current user's profile row (any tenant).
 * Returns null if not authenticated or no profile found.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, tenant_id, display_name, avatar_url, created_at')
    .eq('id', user.id)
    .single() as { data: Profile | null; error: unknown }

  if (error || !profile) return null
  return profile
}

/**
 * Requires auth. Redirects to /login if no session.
 * Use in protected Server Component pages.
 */
export async function requireAuth() {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

/**
 * Returns the current user's profile row, scoped to the given tenant.
 * Email comes from auth.users via supabase.auth.getUser() — not from profiles.
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
    .select('id, tenant_id, display_name, avatar_url, created_at')
    .eq('id', user.id)
    .eq('tenant_id', tenantId)
    .single() as { data: Profile | null; error: unknown }

  if (error || !profile) return null

  return {
    id: user.id,
    email: user.email ?? '',
    profile,
  }
}
