'use client'

import { PostCard } from '@/components/PostCard'
import type { PostWithAuthor } from '@/app/page'
import type { Tenant, TenantMember } from '@/lib/tenant'

interface FeedProps {
  posts: PostWithAuthor[]
  tenant: Tenant
}

export function Feed({ posts, tenant }: FeedProps) {
  // Build a lookup from member slug → accent colour for the band-member dot
  const memberColourMap = buildMemberColourMap(tenant.members)

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-cream)' }}
    >
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            {tenant.config.siteTitle}
          </h1>
          {tenant.config.siteTagline && (
            <span
              className="text-xs hidden sm:block"
              style={{ color: 'var(--color-slate)' }}
            >
              {tenant.config.siteTagline}
            </span>
          )}
        </div>
      </header>

      {/* ── Feed ── */}
      <main>
        {posts.length === 0 ? (
          <EmptyState tenantName={tenant.config.siteTitle} />
        ) : (
          <ul className="list-none m-0 p-0">
            {posts.map((post) => {
              const accentColor = post.author?.member_slug
                ? memberColourMap[post.author.member_slug] ?? null
                : null

              return (
                <li key={post.id}>
                  <PostCard post={post} memberAccentColor={accentColor} />
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildMemberColourMap(
  members: TenantMember[]
): Record<string, string | null> {
  return Object.fromEntries(
    members.map((m) => [m.slug, m.accentColor])
  )
}

function EmptyState({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-3">
      <span
        className="text-4xl select-none"
        aria-hidden="true"
      >
        🎵
      </span>
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-ink)' }}
      >
        {tenantName}
      </p>
      <p
        className="text-sm max-w-xs"
        style={{ color: 'var(--color-slate)' }}
      >
        No posts yet. Check back soon.
      </p>
    </div>
  )
}
