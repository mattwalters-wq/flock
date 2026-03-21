import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceClient
      .from('shows')
      .insert({
        tenant_id: tenant.id,
        date: body.date,
        venue: body.venue,
        city: body.city,
        country: body.country ?? '',
        region: body.region ?? 'australia',
        ticket_url: body.ticket_url ?? null,
        status: body.status ?? 'announced',
        checkin_code: body.checkin_code ?? null,
      })

    if (error) {
      console.error('[shows/create] error:', error)
      return NextResponse.json({ error: 'Failed to create show' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[shows/create] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
