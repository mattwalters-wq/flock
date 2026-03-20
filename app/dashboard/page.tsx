import { redirect } from 'next/navigation'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const slug = await getTenantSlug()
  const tenant = await getTenant(slug)

  if (!tenant) {
    redirect('/')
  }

  // Set tenant context so RLS policies resolve current_tenant_id() correctly.
  // Without this, profiles_read policy returns no rows and the query silently fails.
  await supabase.rpc('set_tenant', { p_slug: slug })

  const { data: profileRow, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, bio, city, avatar_url, role, band_member, stamp_count, stamp_level, show_count, referral_code, referral_count, email_notifications, tenant_id, created_at')
    .eq('id', user.id)
    .eq('tenant_id', tenant.id)
    .single() as { data: Profile | null; error: unknown }

  if (profileError || !profileRow) {
    redirect('/')
  }

  if (profileRow.role !== 'band' && profileRow.role !== 'admin') {
    redirect('/')
  }

  return <DashboardShell tenant={tenant} profile={profileRow} />
}
