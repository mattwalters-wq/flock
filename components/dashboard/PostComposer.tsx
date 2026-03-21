'use client'

import { useState, useRef, useEffect } from 'react'
import type { Tenant } from '@/lib/tenant'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface PostComposerProps {
  tenant: Tenant
  profile: Profile
}

export function PostComposer({ tenant, profile }: PostComposerProps) {
  const [content, setContent] = useState('')
  const [feedType, setFeedType] = useState('community')
  const [images, setImages] = useState<string[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioName, setAudioName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const isDisabled = uploading || submitting
  const canSubmit = content.trim().length > 0 && !isDisabled

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  async function uploadFile(file: File, bucket: string): Promise<string | null> {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) { console.error('Upload error:', error); return null }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (images.length + files.length > 6) {
      setError('Maximum 6 images per post')
      return
    }
    setUploading(true)
    setError(null)
    const urls: string[] = []
    for (const file of files) {
      const url = await uploadFile(file, 'post-images')
      if (url) urls.push(url)
    }
    setImages(prev => [...prev, ...urls])
    setUploading(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const url = await uploadFile(file, 'post-audio')
    if (url) {
      setAudioUrl(url)
      setAudioName(file.name)
    }
    setUploading(false)
    if (audioInputRef.current) audioInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          feed_type: feedType,
          images: images.length > 0 ? images : null,
          audio_url: audioUrl,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setContent('')
        setImages([])
        setAudioUrl(null)
        setAudioName(null)
        setFeedType('community')
        setMessage('Posted!')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setError(data.error ?? 'Failed to post')
      }
    } catch {
      setError('Failed to post. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const memberOptions = tenant.members.map(m => ({ value: m.slug, label: m.name }))

  return (
    <>
      <style>{`
        .composer-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 16px;
        }
        .composer-textarea {
          width: 100%;
          border: none;
          background: var(--color-cream);
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
          color: var(--color-ink);
          resize: none;
          min-height: 80px;
          outline: none;
          box-sizing: border-box;
          line-height: 1.5;
        }
        .composer-textarea::placeholder { color: var(--color-slate); }
        .composer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          gap: 10px;
          flex-wrap: wrap;
        }
        .composer-feed-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-slate);
          font-family: var(--font-dm-mono), monospace;
          white-space: nowrap;
        }
        .composer-feed-select {
          flex: 1;
          max-width: 220px;
          padding: 7px 10px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--color-ink);
          background: var(--color-cream);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .composer-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .composer-upload-btn {
          padding: 7px 12px;
          background: none;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--color-slate);
          cursor: pointer;
          font-family: var(--font-dm-sans), sans-serif;
          transition: border-color 0.15s, color 0.15s;
        }
        .composer-upload-btn:hover {
          border-color: var(--color-ruby);
          color: var(--color-ruby);
        }
        .composer-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .composer-submit-btn {
          margin-left: auto;
          padding: 9px 20px;
          background: var(--color-ruby);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-dm-sans), sans-serif;
          transition: opacity 0.15s;
        }
        .composer-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .composer-images {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .composer-image-thumb {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .composer-image-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .composer-image-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .composer-audio {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px 10px;
          background: var(--color-cream);
          border-radius: 6px;
          font-size: 12px;
          color: var(--color-slate);
        }
        .composer-audio-remove {
          background: none;
          border: none;
          color: var(--color-slate);
          cursor: pointer;
          font-size: 14px;
          margin-left: auto;
          padding: 0;
        }
        .composer-message {
          margin-top: 8px;
          font-size: 12px;
          color: var(--color-slate);
          text-align: center;
        }
        .composer-error {
          margin-top: 8px;
          font-size: 12px;
          color: var(--color-ruby);
          text-align: center;
        }
      `}</style>
      <form className="composer-card" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder="Share something with your community..."
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={isDisabled}
        />

        {images.length > 0 && (
          <div className="composer-images">
            {images.map((url, i) => (
              <div key={i} className="composer-image-thumb">
                <img src={url} alt="" />
                <button
                  type="button"
                  className="composer-image-remove"
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {audioUrl && (
          <div className="composer-audio">
            <span>🎵</span>
            <span>{audioName ?? 'Audio file'}</span>
            <button type="button" className="composer-audio-remove" onClick={() => { setAudioUrl(null); setAudioName(null) }}>×</button>
          </div>
        )}

        <div className="composer-row">
          <span className="composer-feed-label">Post to</span>
          <select
            className="composer-feed-select"
            value={feedType}
            onChange={e => setFeedType(e.target.value)}
            disabled={isDisabled}
          >
            <option value="community">Community</option>
            {memberOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="composer-actions">
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageChange} />
          <input ref={audioInputRef} type="file" accept=".m4a,.mp3,.wav,.aac,.ogg" hidden onChange={handleAudioChange} />
          <button
            type="button"
            className="composer-upload-btn"
            onClick={() => imageInputRef.current?.click()}
            disabled={isDisabled || images.length >= 6}
          >
            {uploading ? 'Uploading...' : '+ Add image'}
          </button>
          {!audioUrl && (
            <button
              type="button"
              className="composer-upload-btn"
              onClick={() => audioInputRef.current?.click()}
              disabled={isDisabled}
            >
              + Add audio
            </button>
          )}
          <button
            type="submit"
            className="composer-submit-btn"
            disabled={!canSubmit}
          >
            {submitting ? 'Posting...' : 'Post to community'}
          </button>
        </div>

        {message && <div className="composer-message">{message}</div>}
        {error && <div className="composer-error">{error}</div>}
      </form>
    </>
  )
}
