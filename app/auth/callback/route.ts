import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? 'auth_failed')}`
    )
  }

  const tenantSlug = request.headers.get('x-tenant-slug')

  if (tenantSlug) {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single() as { data: { id: number } | null }

    if (tenantRow) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          tenant_id: tenantRow.id,
          display_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          stamp_count: 0,
          stamp_level: 1,
          role: 'fan',
        } as any,
        { onConflict: 'id', ignoreDuplicates: true }
      )

      const createdAt = new Date(data.user.created_at).getTime()
      const isNewUser = Date.now() - createdAt < 30_000

      if (isNewUser) {
        try {
          await fetch(`${origin}/api/email/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              displayName:
                data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
            }),
          })
        } catch {
          // Non-fatal
        }
      }
    }
  }

  const redirectTo = next.startsWith('/') ? `${origin}${next}` : next
  return NextResponse.redirect(redirectTo)
}