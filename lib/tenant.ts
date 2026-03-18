import { createClient } from '@/lib/supabase/server'
import type { TenantRow, TenantConfigRow, TenantMemberRow } from '@/types/supabase'

// ============================================================
// Types
// ============================================================

export type TenantMember = {
    id: number
    slug: string
    name: string
    accentColor: string | null
    bio: string | null
    avatarUrl: string | null
    displayOrder: number
}

export type TenantPalette = {
    INK: string
    CREAM: string
    SURFACE: string
    RUBY: string
    BLUSH: string
    HOT_PINK: string
    WARM_GOLD: string
    SLATE: string
    BORDER: string
}

export type TenantLinks = {
    spotify: string | null
    appleMusic: string | null
    youtubeMusic: string | null
    bandcamp: string | null
    soundcloud: string | null
    instagram: string | null
    twitter: string | null
    facebook: string | null
    tiktok: string | null
}

export type TenantConfig = {
    siteTitle: string
    siteTagline: string
    metaDescription: string
    palette: TenantPalette
    spotifyEmbedUrls: string[]
    links: TenantLinks
    resendFromAddress: string | null
    resendSendingDomain: string | null
}

export type Tenant = {
    id: number
    slug: string
    name: string
    customDomain: string | null
    config: TenantConfig
    members: TenantMember[]
}

// ============================================================
// Internal helpers
// ============================================================

function buildConfig(rows: { key: string; value: string | null }[]): TenantConfig {
    const kv = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
    const spotifyEmbedUrls: string[] = []
        let i = 1
    while (kv[`spotify_embed_url_${i}`]) {
          spotifyEmbedUrls.push(kv[`spotify_embed_url_${i}`])
          i++
    }
    return {
          siteTitle: kv['site_title'] ?? '',
          siteTagline: kv['site_tagline'] ?? '',
          metaDescription: kv['meta_description'] ?? '',
          palette: {
                  INK: kv['color_ink'] || '#1A1A1A',
                  CREAM: kv['color_cream'] || '#F5F0E8',
                  SURFACE: kv['color_surface'] || '#FFFFFF',
                  RUBY: kv['color_ruby'] || '#C41E3A',
                  BLUSH: kv['color_blush'] || '#F2D7D5',
                  HOT_PINK: kv['color_hot_pink'] || '#FF69B4',
                  WARM_GOLD: kv['color_warm_gold'] || '#D4A017',
                  SLATE: kv['color_slate'] || '#708090',
                  BORDER: kv['color_border'] || '#E0D8CC',
          },
          spotifyEmbedUrls,
          links: {
                  spotify: kv['link_spotify'] || null,
                  appleMusic: kv['link_apple_music'] || null,
                  youtubeMusic: kv['link_youtube_music'] || null,
                  bandcamp: kv['link_bandcamp'] || null,
                  soundcloud: kv['link_soundcloud'] || null,
                  instagram: kv['link_instagram'] || null,
                  twitter: kv['link_twitter'] || null,
                  facebook: kv['link_facebook'] || null,
                  tiktok: kv['link_tiktok'] || null,
          },
          resendFromAddress: kv['resend_from_address'] || null,
          resendSendingDomain: kv['resend_sending_domain'] || null,
    }
}

function buildMembers(
    rows: {
          id: number
          slug: string
          name: string
          accent_color: string | null
          bio: string | null
          avatar_url: string | null
          display_order: number
    }[]
  ): TenantMember[] {
    return rows
      .sort((a, b) => a.display_order - b.display_order)
      .map((r) => ({
              id: r.id,
              slug: r.slug,
              name: r.name,
              accentColor: r.accent_color,
              bio: r.bio,
              avatarUrl: r.avatar_url,
              displayOrder: r.display_order,
      }))
}

// ============================================================
// Server-side fetch functions
// ============================================================

export async function getTenant(slug: string): Promise<Tenant | null> {
    const supabase = await createClient()

  const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name, custom_domain')
      .eq('slug', slug)
      .single() as {
          data: Pick<TenantRow, 'id' | 'slug' | 'name' | 'custom_domain'> | null
          error: unknown
  }

  if (tenantError || !tenantRow) return null

  const [configResult, membersResult] = await Promise.all([
        supabase
          .from('tenant_config')
          .select('key, value')
          .eq('tenant_id', tenantRow.id) as unknown as Promise<{
                    data: Pick<TenantConfigRow, 'key' | 'value'>[] | null
                    error: unknown
          }>,
        supabase
          .from('tenant_members')
          .select('id, slug, name, accent_color, bio, avatar_url, display_order')
          .eq('tenant_id', tenantRow.id) as unknown as Promise<{
                    data: Pick<TenantMemberRow, 'id' | 'slug' | 'name' | 'accent_color' | 'bio' | 'avatar_url' | 'display_order'>[] | null
                    error: unknown
          }>,
      ])

  if (configResult.error) console.error('[getTenant] config error:', configResult.error)
    if (membersResult.error) console.error('[getTenant] members error:', membersResult.error)

  return {
        id: tenantRow.id,
        slug: tenantRow.slug,
        name: tenantRow.name,
        customDomain: tenantRow.custom_domain,
        config: buildConfig(configResult.data ?? []),
        members: buildMembers(membersResult.data ?? []),
  }
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
    const supabase = await createClient()

  const { data: tenantRow, error } = await supabase
      .from('tenants')
      .select('slug')
      .eq('custom_domain', domain)
      .single() as {
          data: Pick<TenantRow, 'slug'> | null
          error: unknown
  }

  if (error || !tenantRow) return null
    return getTenant(tenantRow.slug)
}
