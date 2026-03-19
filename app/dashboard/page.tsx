import { redirect } from 'next/navigation'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

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

  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, bio, city, avatar_url, role, band_member, stamp_count, stamp_level, show_count, referral_code, referral_count, email_notifications, tenant_id, created_at')
      .eq('id', user.id)
      .eq('tenant_id', tenant.id)
      .single()

  if (profileError || !profile) {
        redirect('/')
  }

  if (profile.role !== 'band' && profile.role !== 'admin') {
        redirect('/')
  }

  return <DashboardShell tenant={tenant} profile={profile} />
}
