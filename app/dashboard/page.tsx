export default async function DashboardPage() {
  const slug = await getTenantSlug()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRow } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, bio, city, avatar_url, role, band_member, stamp_count, stamp_level, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profileRow) redirect('/')
  if (profileRow.role !== 'band' && profileRow.role !== 'admin') redirect('/')

  const tenant = await getTenant(slug)
  if (!tenant) redirect('/')

  return <DashboardShell tenant={tenant} profile={profileRow} />
}
