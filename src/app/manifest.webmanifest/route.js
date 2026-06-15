import { headers } from 'next/headers';
import { getTenantBySlug, getTenantPalette } from '@/lib/tenant';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

// Per-tenant PWA manifest: themed name + colours so "add to home screen" reflects
// the artist's community. Resolved from the Host header (middleware skips dotted
// paths, so we can't rely on x-tenant-slug here).
export async function GET() {
  const host = headers().get('host') || '';
  let name = 'flock';
  let theme = '#8B1A2B';
  let bg = '#F5EFE6';

  if (host.endsWith(`.${APP_DOMAIN}`) && host !== `www.${APP_DOMAIN}`) {
    const slug = host.replace(`.${APP_DOMAIN}`, '');
    try {
      const tenant = await getTenantBySlug(slug);
      if (tenant) {
        name = tenant.name || 'flock';
        const p = getTenantPalette(tenant);
        theme = p.ruby;
        bg = p.cream;
      }
    } catch { /* fall back to flock defaults */ }
  }

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: bg,
    theme_color: theme,
    icons: [
      { src: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
