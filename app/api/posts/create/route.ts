import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import type { Json } from '@/types/supabase'

interface CreatePostBody {
  content: string
  feed_type?: string
  images?: string[] | null
  audio_url?: string | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check role using regular client
    const { data: profileRow, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profileRow) {
      console.error('[posts/create] profile lookup error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    if (profileRow.role !== 'band' && profileRow.role !== 'admin') {
      return NextResponse.json({ error: 'Only band members and admins can create posts' }, { status: 403 })
    }

    const body = (await request.json()) as CreatePostBody
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

    const images: Json = Array.isArray(body.images) && body.images.length > 0
      ? (body.images as Json)
      : null
    const audioUrl = body.audio_url ?? null

    // Use service role client to bypass RLS for insert
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: post, error: insertError } = await serviceClient
      .from('posts')
      .insert({
        tenant_id: tenant.id,
        author_id: user.id,
        content: body.content.trim(),
        feed_type: body.feed_type ?? 'community',
        images,
        audio_url: audioUrl,
      })
      .select('id')
      .single()

    if (insertError || !post) {
      console.error('[posts/create] insert error:', JSON.stringify(insertError, null, 2))
      return NextResponse.json({ error: 'Failed to create post. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, post_id: post.id }, { status: 201 })

  } catch (err) {
    console.error('[posts/create] unexpected error:', JSON.stringify(err, null, 2))
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
