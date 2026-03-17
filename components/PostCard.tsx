'use client'

import Image from 'next/image'
import { formatRelativeTime } from '@/lib/format-time'
import type { PostWithAuthor } from '@/app/page'

interface PostCardProps {
  post: PostWithAuthor
  /** Accent colour for the band-member dot, from tenant member config */
  memberAccentColor?: string | null
}

export function PostCard({ post, memberAccentColor }: PostCardProps) {
  const { author, content, image_urls, audio_url, created_at } = post
  const displayName = author?.display_name ?? 'Anonymous'
  const avatarUrl = author?.avatar_url ?? null
  const isMember = author?.band_member ?? false

  return (
    <article
      className="w-full border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="px-4 py-4 max-w-[480px] mx-auto">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div
            className="relative flex-shrink-0 w-9 h-9 rounded-full overflow-hidden"
            style={{ background: 'var(--color-blush)' }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <span
                className="flex items-center justify-center w-full h-full text-sm font-medium"
                style={{ color: 'var(--color-ruby)' }}
                aria-hidden="true"
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + timestamp row */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: 'var(--color-ink)' }}
              >
                {displayName}
              </span>
              {/* Band-member colour dot */}
              {isMember && (
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: memberAccentColor ?? 'var(--color-ruby)',
                  }}
                  title="Band member"
                  aria-label="Band member"
                />
              )}
              {author?.role && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-slate)' }}
                >
                  · {author.role}
                </span>
              )}
            </div>
            <time
              dateTime={created_at}
              className="text-xs"
              style={{ color: 'var(--color-slate)' }}
            >
              {formatRelativeTime(created_at)}
            </time>
          </div>
        </div>

        {/* ── Text content ── */}
        {content && (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            {content}
          </p>
        )}

        {/* ── Image gallery ── */}
        {image_urls && image_urls.length > 0 && (
          <ImageGallery urls={image_urls.slice(0, 6)} alt={displayName} />
        )}

        {/* ── Audio player ── */}
        {audio_url && <AudioPlayer url={audio_url} />}
      </div>
    </article>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ImageGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const count = urls.length
  const isSingle = count === 1

  return (
    <div
      className={[
        'rounded-xl overflow-hidden mb-3',
        isSingle ? 'aspect-[4/3]' : 'grid gap-0.5',
        count === 2 ? 'grid-cols-2' : '',
        count === 3 ? 'grid-cols-2' : '',
        count >= 4 ? 'grid-cols-2' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: 'var(--color-blush)' }}
    >
      {urls.map((url, i) => (
        <div
          key={url}
          className={[
            'relative overflow-hidden',
            isSingle ? 'w-full h-full' : 'aspect-square',
            // Make third image span full width in a 3-image layout
            count === 3 && i === 2 ? 'col-span-2' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Image
            src={url}
            alt={`${alt} photo ${i + 1}`}
            fill
            sizes="(max-width: 480px) 50vw, 240px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  )
}

function AudioPlayer({ url }: { url: string }) {
  // Derive a friendly label from the filename
  const filename = url.split('/').pop()?.split('?')[0] ?? 'Audio'
  const label = decodeURIComponent(filename)
    .replace(/\.(m4a|mp3|wav|ogg|flac)$/i, '')
    .replace(/[-_]/g, ' ')

  return (
    <div
      className="rounded-xl p-3 mb-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p
        className="text-xs font-medium mb-2 truncate"
        style={{ color: 'var(--color-slate)' }}
      >
        🎵 {label}
      </p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        controls
        preload="metadata"
        className="w-full h-8"
        style={{ accentColor: 'var(--color-ruby)' }}
      >
        <source src={url} />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
