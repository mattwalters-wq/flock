'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  isLoggedIn: boolean
  profile: Profile | null
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="


24" fill="none" aria-hidden>
      <path
        d="M
9.5L
3l
6.5V20a



1-
1H5a



1-1-1V9.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.
: 0}
      />
      <path
        d="M
21V12h6v9"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

function ShowsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="


24" fill="none" aria-hidden>
      <rect
        x="3" y="5" width="18" height="14" rx="2"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.
: 0}
      />
      <path
        d="M
9l
3-
3V9z"
        fill="currentColor"
        fillOpacity={active ?
: 0.7}
        stroke="none"
      />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="


24" fill="none" aria-hidden>
      <circle
        cx="12" cy="8" r="4"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.
: 0}
      />
      <path
        d="M
20c0-3.
3.582-
8-6s
2.

6"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

function LoginIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="


24" fill="none" aria-hidden>
      <path
        d="M
3h4a





2v14a



1-
2h-4"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        strokeLinecap="round"
      />
      <path
        d="M
17l5-5-5-5M
12H3"
        stroke="currentColor"
        strokeWidth={active ? 2.
: 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BottomNav({ isLoggedIn, profile }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const navItems = [
    {
      href: '/',
      label: 'Feed',
      icon: (active: boolean) => <HomeIcon active={active} />,
    },
    {
      href: '/shows',
      label: 'Shows',
      icon: (active: boolean) => <ShowsIcon active={active} />,
    },
    isLoggedIn
      ? {
          href: '/profile',
          label: profile?.display_name?.split(' ')[0] ?? 'Profile',
          icon: (active: boolean) => <ProfileIcon active={active} />,
        }
      : {
          href: '/login',
          label: 'Sign in',
          icon: (active: boolean) => <LoginIcon active={active} />,
        },
  ]

  return (
    <>
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: var(--color-surface, #fff);
          border-top: 1px solid var(--color-border, #E0D8CC);
          display: flex;
          /* Safe area inset for iPhone home bar */
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px
8px;
          text-decoration: none;
          color: var(--color-slate, #708090);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
          transition: color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .bottom-nav-item--active {
          color: var(--color-ruby, #C41E3A);
        }

        .bottom-nav-item:not(.bottom-nav-item--active):hover {
          color: var(--color-ink, #1A1A1A);
        }

        /* Spacer so page content doesn't hide under nav */
        .bottom-nav-spacer {
          height: calc(64px + env(safe-area-inset-bottom, 0px));
        }
      `}</style>

      <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item${active ? ' bottom-nav-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Push page content above the nav */}
      <div className="bottom-nav-spacer" aria-hidden />
    </>
  )
}
 
