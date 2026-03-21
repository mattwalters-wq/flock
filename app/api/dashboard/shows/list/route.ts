import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: shows, error } = await serviceClient
      .from('shows')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('date', { ascending: true })

    if (error) {
      console.error('[shows/list] error:', error)
      return NextResponse.json({ shows: [] })
    }

    return NextResponse.json({ shows: shows ?? [] })
  } catch (err) {
    console.error('[shows/list] unexpected error:', err)
    return NextResponse.json({ shows: [] })
  }
}
