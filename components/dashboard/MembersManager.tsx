'use client'

import { useState, useEffect } from 'react'
import type { Tenant } from '@/lib/tenant'

interface MembersManagerProps {
  tenant: Tenant
}

interface Member {
  id: number
  name: string
  slug: string
  accent_color: string
  bio: string | null
  display_order: number
}

export function MembersManager({ tenant }: MembersManagerProps) {
  const [members, setMembers] = useState<Member[]>(
    tenant.members.map(m => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      accent_color: m.accentColor,
      bio: m.bio ?? null,
      display_order: m.displayOrder,
    }))
  )
  const [saving, setSaving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function saveMember(member: Member) {
    setSaving(member.id)
    setMessage(null)
    try {
      const res = await fetch('/api/dashboard/members/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      })
      if (res.ok) {
        setMessage('Saved')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage('Failed to save')
      }
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  function updateMember(id: number, field: keyof Member, value: string) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  return (
    <>
      <style>{`
        .members-list { display: flex; flex-direction: column; gap: 12px; }
        .member-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 16px;
        }
        .member-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .member-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .member-name-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-ink);
        }
        .member-field { margin-bottom: 10px; }
        .member-field label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-slate);
          margin-bottom: 4px;
          font-family: var(--font-dm-mono), monospace;
        }
        .member-field input,
        .member-field textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--color-ink);
          background: var(--color-cream);
          font-family: var(--font-dm-sans), sans-serif;
          box-sizing: border-box;
        }
        .member-field textarea { resize: vertical; min-height: 60px; }
        .member-color-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .member-color-row input[type="color"] {
          width: 40px;
          height: 32px;
          padding: 2px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          cursor: pointer;
        }
        .member-save-btn {
          margin-top: 10px;
          padding: 8px 16px;
          background: var(--color-ruby);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.04em;
          font-family: var(--font-dm-mono), monospace;
          text-transform: uppercase;
        }
        .member-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .members-message {
          text-align: center;
          font-size: 12px;
          color: var(--color-slate);
          margin-top: 8px;
        }
      `}</style>
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-card-header">
              <div className="member-color-dot" style={{ background: member.accent_color }} />
              <span className="member-name-label">{member.name}</span>
            </div>
            <div className="member-field">
              <label>Name</label>
              <input
                type="text"
                value={member.name}
                onChange={e => updateMember(member.id, 'name', e.target.value)}
              />
            </div>
            <div className="member-field">
              <label>Bio</label>
              <textarea
                value={member.bio ?? ''}
                onChange={e => updateMember(member.id, 'bio', e.target.value)}
                placeholder="Short bio..."
              />
            </div>
            <div className="member-field">
              <label>Accent colour</label>
              <div className="member-color-row">
                <input
                  type="color"
                  value={member.accent_color}
                  onChange={e => updateMember(member.id, 'accent_color', e.target.value)}
                />
                <span style={{ fontSize: 12, color: 'var(--color-slate)', fontFamily: 'monospace' }}>
                  {member.accent_color}
                </span>
              </div>
            </div>
            <button
              className="member-save-btn"
              onClick={() => saveMember(member)}
              disabled={saving === member.id}
            >
              {saving === member.id ? 'Saving...' : 'Save'}
            </button>
          </div>
        ))}
        {message && <div className="members-message">{message}</div>}
      </div>
    </>
  )
}
