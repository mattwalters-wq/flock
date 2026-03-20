import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { data: profileRow, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('tenant_id', tenant.id)
      .single() as { data: { role: string | null } | null; error: unknown }

    if (profileError || !profileRow) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    if (profileRow.role !== 'band' && profileRow.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only band members and admins can create posts' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as CreatePostBody

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

    const feedType = body.feed_type ?? 'community'
    const images: Json =
      Array.isArray(body.images) && body.images.length > 0
        ? (body.images as Json)
        : null
    const audioUrl =
      body.audio_url && typeof body.audio_url === 'string' ? body.audio_url : null

    const { data: post, error: insertError } = await (supabase as any)
      .from('posts')
      .insert({
        tenant_id: tenant.id,
        author_id: user.id,
        content: body.content.trim(),
        feed_type: feedType,
        images,
        audio_url: audioUrl,
      })
      .select('id')
      .single() as { data: { id: string } | null; error: unknown }

    if (insertError || !post) {
      console.error('[posts/create] insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create post. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, post_id: post.id }, { status: 201 })
  } catch (err) {
    console.error('[posts/create] unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
