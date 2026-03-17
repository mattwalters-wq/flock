'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tenant } from '@/lib/tenant'

// ============================================================
// Re-export types so client components can import from one place
// ============================================================
export type { Tenant } from '@/lib/tenant'

// ── Raw DB row shapes ──────────────────────────────────────────────────────
type TenantRow = {
    id: number
    slug: string
    name: string
    custom_domain: string | null
}

type ConfigRow = {
    key: string
    value: string | null
}

type MemberRow = {
    id: number
    slug: string
    name: string
    accent_color: string | null
    bio: string | null
    avatar_url: string | null
    display_order: number
}

// ============================================================
// Client-side hook
// ============================================================
type UseTenantResult =
    | { status: 'loading'; tenant: null; error: null }
  | { status: 'error'; tenant: null; error: string }
  | { status: 'ready'; tenant: Tenant; error: null }

/**
   * React hook that fetches a tenant's config client-side.
   *
   * Prefer passing tenant as a prop from a Server Component whenever possible
   * (see app/page.tsx). Use this hook only in deeply nested Client Components
   * that don't receive tenant as a prop.
   */
export function useTenant(slug: string): UseTenantResult {
    const [result, setResult] = useState<UseTenantResult>({
          status: 'loading',
          tenant: null,
          error: null,
    })

  useEffect(() => {
        if (!slug) return
        let cancelled = false
        setResult({ status: 'loading', tenant: null, error: null })

                async function load() {
                        try {
                                  const supabase = createClient()
                                  const { data: tenantRow, error: tenantError } = await supabase
                                    .from('tenants')
                                    .select('id, slug, name, custom_domain')
                                    .eq('slug', slug)
                                    .single() as { data: TenantRow | null; error: { message: string } | null }

                          if (tenantError || !tenantRow) throw new Error(tenantError?.message ?? 'Tenant not found')

                          const [configResult, membersResult] = await Promise.all([
                                      supabase
                                        .from('tenant_config')
                                        .select('key, value')
                                        .eq('tenant_id', tenantRow.id) as Promise<{ data: ConfigRow[] | null; error: unknown }>,
                                      supabase
                                        .from('tenant_members')
                                        .select('id, slug, name, accent_color, bio, avatar_url, display_order')
                                        .eq('tenant_id', tenantRow.id) as Promise<{ data: MemberRow[] | null; error: unknown }>,
                                    ])

                          if ((configResult as { error: unknown }).error) throw (configResult as { error: unknown }).error
                                  if ((membersResult as { error: unknown }).error) throw (membersResult as { error: unknown }).error

                          // Build config inline (mirrors server-side buildConfig)
                          const kv = Object.fromEntries(
                                      (configResult.data ?? []).map((r) => [r.key, r.value ?? ''])
                                    )
                                  const spotifyEmbedUrls: string[] = []
                                            let i = 1
                                  while (kv[`spotify_embed_url_${i}`]) {
                                              spotifyEmbedUrls.push(kv[`spotify_embed_url_${i}`]); i++
                                  }

                          const tenant: Tenant = {
                                      id: tenantRow.id,
                                      slug: tenantRow.slug,
                                      name: tenantRow.name,
                                      customDomain: tenantRow.custom_domain,
                                      config: {
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
                                      },
                                      members: (membersResult.data ?? [])
                                        .sort((a, b) => a.display_order - b.display_order)
                                        .map((r) => ({
                                                        id: r.id,
                                                        slug: r.slug,
                                                        name: r.name,
                                                        accentColor: r.accent_color,
                                                        bio: r.bio,
                                                        avatarUrl: r.avatar_url,
                                                        displayOrder: r.display_order,
                                        })),
                          }

                          if (!cancelled) setResult({ status: 'ready', tenant, error: null })
                        } catch (err) {
                                  if (!cancelled)
                                              setResult({
                                                            status: 'error',
                                                            tenant: null,
                                                            error: err instanceof Error ? err.message : 'Unknown error',
                                              })
                        }
                }

                load()
        return () => { cancelled = true }
  }, [slug])

  return result
}
