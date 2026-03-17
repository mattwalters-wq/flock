import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { getSession, getProfile } from '@/lib/auth'
import BottomNav from '@/components/BottomNav'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-dm-mono', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  try {
    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)
    if (!tenant) return { title: 'Flock' }
    const { siteTitle, siteTagline, metaDescription } = tenant.config
    return {
      title: { default: siteTitle, template: `%s · ${siteTitle}` },
      description: metaDescription || siteTagline,
      openGraph: { title: siteTitle, description: metaDescription || siteTagline, type: 'website' },
      twitter: { card: 'summary', title: siteTitle, description: metaDescription || siteTagline },
    }
  } catch {
    return { title: 'Flock' }
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let palette = {
    INK: '#1A1A1A', CREAM: '#F5F0E8', SURFACE: '#FFFFFF', RUBY: '#C41E3A',
    BLUSH: '#F2D7D5', HOT_PINK: '#FF69B4', WARM_GOLD: '#D4A017', SLATE: '#708090', BORDER: '#E0D8CC',
  }

  try {
    const slug = await getTenantSlug()
    const tenant = await getTenant(slug)
    if (tenant) palette = tenant.config.palette
  } catch {}

  // Fetch session + profile in parallel - non-blocking, layout never redirects
  const [session, profile] = await Promise.allSettled([
    getSession(),
    getProfile(),
  ])

  const isLoggedIn = session.status === 'fulfilled' && !!session.value
  const resolvedProfile = profile.status === 'fulfilled' ? profile.value : null

  const cssVars = `
    --color-ink: ${palette.INK};
    --color-cream: ${palette.CREAM};
    --color-surface: ${palette.SURFACE};
    --color-ruby: ${palette.RUBY};
    --color-blush: ${palette.BLUSH};
    --color-hot-pink: ${palette.HOT_PINK};
    --color-warm-gold: ${palette.WARM_GOLD};
    --color-slate: ${palette.SLATE};
    --color-border: ${palette.BORDER};
  `.trim()

  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} style={{ colorScheme: 'light' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <style>{`:root { ${cssVars} } *, *::before, *::after { box-sizing: border-box; } body { margin: 0; background-color: var(--color-cream); color: var(--color-ink); font-family: var(--font-dm-sans), system-ui, sans-serif; -webkit-font-smoothing: antialiased; }`}</style>
      </head>
      <body>
        {children}
        <BottomNav isLoggedIn={isLoggedIn} profile={resolvedProfile} />
      </body>
    </html>
  )
}
