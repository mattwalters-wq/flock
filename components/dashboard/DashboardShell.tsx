'use client'

import { useState } from 'react'
import { PostComposer } from '@/components/dashboard/PostComposer'
import { MembersManager } from '@/components/dashboard/MembersManager'
import { ShowsManager } from '@/components/dashboard/ShowsManager'
import type { Tenant } from '@/lib/tenant'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface DashboardShellProps {
  tenant: Tenant
  profile: Profile
}

type Tab = 'posts' | 'members' | 'shows'

export function DashboardShell({ tenant, profile }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const artistName = profile.display_name || 'Artist'

  return (
    <>
      <style>{`
        .dash-shell {
          min-height: 100dvh;
          background: var(--color-cream);
          font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
          padding-bottom: 80px;
        }
        .dash-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }
        .dash-header-inner {
          max-width: 480px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dash-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dash-logo-dot {
          display: block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-ruby);
          flex-shrink: 0;
        }
        .dash-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--color-ink);
        }
        .dash-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .dash-artist-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-slate);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
        .dash-signout {
          font-size: 12px;
          color: var(--color-slate);
          text-decoration: none;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: color 0.15s;
        }
        .dash-signout:hover {
          color: var(--color-ruby);
        }
        .dash-main {
          padding: 24px 16px 0;
        }
        .dash-content {
          max-width: 480px;
          margin: 0 auto;
        }
        .dash-tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 20px;
          gap: 4px;
        }
        .dash-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--color-slate);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 10px 16px 10px 0;
          cursor: pointer;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
          font-family: var(--font-dm-mono), monospace;
        }
        .dash-tab--active {
          color: var(--color-ruby);
          border-bottom-color: var(--color-ruby);
          font-weight: 600;
        }
        .dash-tab:hover:not(.dash-tab--active) {
          color: var(--color-ink);
        }
      `}</style>
      <div className="dash-shell">
        <header className="dash-header">
          <div className="dash-header-inner">
            <div className="dash-header-left">
              <span className="dash-logo-dot" aria-hidden="true" />
              <h1 className="dash-title">Dashboard</h1>
            </div>
            <div className="dash-header-right">
              <span className="dash-artist-name">{artistName}</span>
              <a href="/api/auth/signout" className="dash-signout">Sign out</a>
            </div>
          </div>
        </header>
        <main className="dash-main">
          <div className="dash-content">
            <div className="dash-tabs" role="tablist">
              {(['posts', 'members', 'shows'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  className={`dash-tab${activeTab === tab ? ' dash-tab--active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 'posts' && <PostComposer tenant={tenant} profile={profile} />}
            {activeTab === 'members' && <MembersManager tenant={tenant} />}
            {activeTab === 'shows' && <ShowsManager tenant={tenant} />}
          </div>
        </main>
      </div>
    </>
  )
}
