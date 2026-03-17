import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Feed } from '@/components/Feed'
import type { Tenant } from '@/lib/tenant'

export type PostWithAuthor = {
  id: number
  content: string | null
  image_urls: string[] | null
  audio_url: string | null
  post_type: string
  created_at: string
  tenant_id: number
  author: {
    id: string
    display_name: string | null
    avatar_url: string | null
    band_member: boolean
    role: string | null
    member_slug: string | null
  } | null
}

export default async function HomePage() {
  const slug = await getTenantSlug()
  const [tenant, posts] = await Promise.all([
    getTenant(slug),
    fetchPosts(slug),
  ])

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p style={{ color: 'var(--color-slate)' }}>Community not found.</p>
      </main>
    )
  }

  return <Feed posts={posts} tenant={tenant} />
}

async function fetchPosts(slug: string): Promise<PostWithAuthor[]> {
  const supabase = await createClient(slug)

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      image_urls,
      audio_url,
      post_type,
      created_at,
      tenant_id,
      author:profiles (
        id,
        display_name,
        avatar_url,
        band_member,
        role,
        member_slug
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[HomePage] fetchPosts error:', error)
    return []
  }

  // Supabase returns author as an array when using a join — normalise to single object
  return (data ?? []).map((row) => ({
    ...(row as object),
    author: Array.isArray(row.author) ? (row.author[0] ?? null) : row.author,
  })) as PostWithAuthor[]
}
