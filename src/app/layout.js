import './globals.css';
import { headers } from 'next/headers';
import { getTenantBySlug, getTenantByDomain, getTenantPalette } from '@/lib/tenant';
import { AuthProvider } from '@/lib/auth-context';

export default async function RootLayout({ children }) {
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  const host = headersList.get('x-host') || '';

  console.log('[layout] host:', host, 'tenantSlug:', tenantSlug);

  let tenant = null;
  if (tenantSlug === '__custom__') {
    tenant = await getTenantByDomain(host);
  } else if (tenantSlug && tenantSlug !== '__custom__') {
    tenant = await getTenantBySlug(tenantSlug);
  }

  const palette = getTenantPalette(tenant);
  const tenantId = tenant?.id || null;
  const tenantName = tenant?.name || 'flock';

  const cssVars = `
    :root {
      --ink: ${palette.ink};
      --cream: ${palette.cream};
      --ruby: ${palette.ruby};
      --blush: ${palette.blush};
      --warm-gold: ${palette.warmGold};
      --slate: ${palette.slate};
      --surface: ${palette.surface};
      --border: ${palette.border};
    }
  `;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:wght@400;700;900&family=Space+Grotesk:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <title>{tenantName} · flock</title>
        <meta name="description" content={`${tenantName} fan community. Earn points, unlock rewards, connect directly with the artists.`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={`${tenantName} · flock`} />
        <meta property="og:title" content={`${tenantName} · fan community`} />
        <meta property="og:description" content={`Join the ${tenantName} fan community. Earn points, unlock rewards, connect directly with the artists.`} />
        <meta property="og:image" content="https://fans-flock.com/og-community.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${tenantName} · fan community`} />
        <meta name="twitter:description" content={`Join the ${tenantName} fan community. Earn points, unlock rewards, connect directly with the artists.`} />
        <meta name="twitter:image" content="https://fans-flock.com/og-community.png" />

        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body>
        <AuthProvider tenantId={tenantId}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
