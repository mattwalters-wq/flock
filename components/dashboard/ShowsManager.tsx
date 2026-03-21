'use client'

import { useState, useEffect } from 'react'
import type { Tenant } from '@/lib/tenant'

interface ShowsManagerProps {
  tenant: Tenant
}

interface Show {
  id: string
  date: string
  venue: string
  city: string
  country: string
  region: string
  ticket_url: string | null
  status: string
  checkin_code: string | null
}

export function ShowsManager({ tenant }: ShowsManagerProps) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [newShow, setNewShow] = useState<Partial<Show>>({
    status: 'announced',
    region: 'australia',
  })

  useEffect(() => {
    fetchShows()
  }, [])

  async function fetchShows() {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/shows/list')
      const data = await res.json()
      setShows(data.shows ?? [])
    } catch {
      setShows([])
    } finally {
      setLoading(false)
    }
  }

  async function addShow() {
    if (!newShow.date || !newShow.venue || !newShow.city) {
      setMessage('Date, venue and city are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/shows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShow),
      })
      if (res.ok) {
        setMessage('Show added')
        setAdding(false)
        setNewShow({ status: 'announced', region: 'australia' })
        fetchShows()
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage('Failed to add show')
      }
    } catch {
      setMessage('Failed to add show')
    } finally {
      setSaving(false)
    }
  }

  async function deleteShow(id: string) {
    if (!confirm('Delete this show?')) return
    await fetch('/api/dashboard/shows/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchShows()
  }

  return (
    <>
      <style>{`
        .shows-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .shows-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-ink);
        }
        .shows-add-btn {
          padding: 7px 14px;
          background: var(--color-ruby);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.04em;
          font-family: var(--font-dm-mono), monospace;
          text-transform: uppercase;
        }
        .shows-list { display: flex; flex-direction: column; gap: 10px; }
        .show-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .show-info { flex: 1; }
        .show-date {
          font-size: 11px;
          font-family: var(--font-dm-mono), monospace;
          color: var(--color-ruby);
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .show-venue {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-ink);
          margin-bottom: 2px;
        }
        .show-location {
          font-size: 12px;
          color: var(--color-slate);
        }
        .show-checkin {
          font-size: 11px;
          font-family: var(--font-dm-mono), monospace;
          color: var(--color-slate);
          margin-top: 6px;
        }
        .show-delete-btn {
          background: none;
          border: none;
          color: var(--color-slate);
          cursor: pointer;
          font-size: 16px;
          padding: 2px;
          line-height: 1;
          transition: color 0.15s;
        }
        .show-delete-btn:hover { color: var(--color-ruby); }
        .show-form {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .show-form-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-slate);
          font-family: var(--font-dm-mono), monospace;
          margin-bottom: 12px;
        }
        .show-field { margin-bottom: 10px; }
        .show-field label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-slate);
          margin-bottom: 4px;
          font-family: var(--font-dm-mono), monospace;
        }
        .show-field input,
        .show-field select {
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
        .show-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .show-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }
        .show-save-btn {
          flex: 1;
          padding: 9px;
          background: var(--color-ruby);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-dm-mono), monospace;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .show-save-btn:disabled { opacity: 0.6; }
        .show-cancel-btn {
          padding: 9px 16px;
          background: none;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 12px;
          color: var(--color-slate);
          cursor: pointer;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .shows-empty {
          text-align: center;
          padding: 32px 16px;
          color: var(--color-slate);
          font-size: 13px;
        }
        .shows-message {
          text-align: center;
          font-size: 12px;
          color: var(--color-slate);
          margin-top: 8px;
        }
      `}</style>

      <div className="shows-header">
        <span className="shows-title">{shows.length} show{shows.length !== 1 ? 's' : ''}</span>
        <button className="shows-add-btn" onClick={() => setAdding(true)}>+ Add show</button>
      </div>

      {adding && (
        <div className="show-form">
          <div className="show-form-title">New show</div>
          <div className="show-form-row">
            <div className="show-field">
              <label>Date</label>
              <input type="date" value={newShow.date ?? ''} onChange={e => setNewShow(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="show-field">
              <label>Status</label>
              <select value={newShow.status} onChange={e => setNewShow(p => ({ ...p, status: e.target.value }))}>
                <option value="announced">Announced</option>
                <option value="on_sale">On sale</option>
                <option value="door_sales">Door sales</option>
                <option value="sold_out">Sold out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="show-field">
            <label>Venue</label>
            <input type="text" placeholder="Venue name" value={newShow.venue ?? ''} onChange={e => setNewShow(p => ({ ...p, venue: e.target.value }))} />
          </div>
          <div className="show-form-row">
            <div className="show-field">
              <label>City</label>
              <input type="text" placeholder="City" value={newShow.city ?? ''} onChange={e => setNewShow(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="show-field">
              <label>Country</label>
              <input type="text" placeholder="Country" value={newShow.country ?? ''} onChange={e => setNewShow(p => ({ ...p, country: e.target.value }))} />
            </div>
          </div>
          <div className="show-form-row">
            <div className="show-field">
              <label>Region</label>
              <select value={newShow.region} onChange={e => setNewShow(p => ({ ...p, region: e.target.value }))}>
                <option value="australia">Australia</option>
                <option value="europe">Europe</option>
                <option value="uk">UK</option>
                <option value="north_america">North America</option>
              </select>
            </div>
            <div className="show-field">
              <label>Check-in code</label>
              <input type="text" placeholder="e.g. STAMPS24" value={newShow.checkin_code ?? ''} onChange={e => setNewShow(p => ({ ...p, checkin_code: e.target.value }))} />
            </div>
          </div>
          <div className="show-field">
            <label>Ticket URL</label>
            <input type="url" placeholder="https://..." value={newShow.ticket_url ?? ''} onChange={e => setNewShow(p => ({ ...p, ticket_url: e.target.value }))} />
          </div>
          <div className="show-form-actions">
            <button className="show-cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="show-save-btn" onClick={addShow} disabled={saving}>
              {saving ? 'Adding...' : 'Add show'}
            </button>
          </div>
        </div>
      )}

      <div className="shows-list">
        {loading ? (
          <div className="shows-empty">Loading shows...</div>
        ) : shows.length === 0 ? (
          <div className="shows-empty">No shows yet. Add your first one above.</div>
        ) : (
          shows.map(show => (
            <div key={show.id} className="show-card">
              <div className="show-info">
                <div className="show-date">{new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div className="show-venue">{show.venue}</div>
                <div className="show-location">{show.city}{show.country ? `, ${show.country}` : ''}</div>
                {show.checkin_code && (
                  <div className="show-checkin">Check-in: {show.checkin_code}</div>
                )}
              </div>
              <button className="show-delete-btn" onClick={() => deleteShow(show.id)} aria-label="Delete show">×</button>
            </div>
          ))
        )}
      </div>
      {message && <div className="shows-message">{message}</div>}
    </>
  )
}
