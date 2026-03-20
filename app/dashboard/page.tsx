import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardPage() {
  const slug = await getTenantSlug()
  const supabase = await createClient()

  // Check session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profileRow, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, bio, city, avatar_url, role, band_member, stamp_count, stamp_level, tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profileRow) {
    redirect('/')
  }

  // Check role
  if (profileRow.role !== 'band' && profileRow.role !== 'admin') {
    redirect('/')
  }

  const tenant = await getTenant(slug)
  if (!tenant) {
    redirect('/')
  }

  return <DashboardShell tenant={tenant} profile={profileRow} />
}
